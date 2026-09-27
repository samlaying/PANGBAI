import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function withMockedFetch<T>(mock: unknown, fn: () => Promise<T>): Promise<T> {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SILICONFLOW_API_KEY;
  process.env.SILICONFLOW_API_KEY = "test-key";
  globalThis.fetch = mock as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SILICONFLOW_API_KEY;
    else process.env.SILICONFLOW_API_KEY = previousKey;
  }
}

test("CRM produces no insights when the extraction LLM fails, even if a known person's name appears", async () => {
  const { db } = await import("../src/db/client");
  const { people } = await import("../src/db/schema");
  const { runWorkplaceCRMPipeline } = await import("../src/server/harness/workplace-crm-worker");

  const personId = `person_crm_fail_${randomUUID().slice(0, 8)}`;
  await db.insert(people).values({ id: personId, name: "聂小倩", role: "业务方" });

  // 上游 500：旧实现会走"人名命中即编造 0.8 置信度证据"的兜底
  const result = await withMockedFetch(
    async () => new Response("upstream exploded", { status: 500 }),
    () =>
      runWorkplaceCRMPipeline({
        sessionId: `sess_crm_${randomUUID().slice(0, 8)}`,
        userMessage: "今天聂小倩在评审会上当众质疑了我的方案",
        assistantReply: "建议先私下对齐她的核心顾虑。",
      }),
  );

  assert.deepEqual(result, { insights: [], preferences: [] });
});

test("insights land only as pending candidates; evidence and person_models stay untouched until confirmation", async () => {
  const { db } = await import("../src/db/client");
  const { evidence, personModels, memoryCandidates } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const { runWorkplaceCRMPipeline } = await import("../src/server/harness/workplace-crm-worker");

  const personId = `person_crm_ok_${randomUUID().slice(0, 8)}`;
  const sessionId = `sess_crm_${randomUUID().slice(0, 8)}`;
  const llmPayload = {
    persons: [
      {
        personId,
        personName: "宁采臣",
        observation: "会上直接否决提案未给理由",
        inferredPattern: "用否定姿态争夺决策权",
        framework: "",
        confidence: 0.72,
        rationale: "连续两次在公开场合先否决后讨论",
      },
    ],
    preferences: [
      {
        kind: "style_nudge",
        observation: "用户说别绕弯子直接给结论",
        guidance: "回答先给结论再给推导",
        confidence: 0.8,
      },
    ],
  };
  const llmBody = JSON.stringify({
    choices: [{ message: { content: JSON.stringify(llmPayload) } }],
  });

  const result = await withMockedFetch(
    async () => new Response(llmBody, { status: 200, headers: { "Content-Type": "application/json" } }),
    () =>
      runWorkplaceCRMPipeline({
        sessionId,
        userMessage: "宁采臣又否决了我，别绕弯子直接给结论",
        assistantReply: "结论：先找他单独对齐一次。",
      }),
  );

  // 候选产出完整，且全部 pending
  assert.equal(result.insights.length, 1);
  assert.ok(result.insights[0].candidateId);
  assert.equal(result.preferences.length, 1);

  const candidates = await db.select().from(memoryCandidates).where(eq(memoryCandidates.conversationId, sessionId));
  assert.equal(candidates.length, 2);
  assert.ok(candidates.every((c) => c.status === "pending"), "all candidates must await user confirmation");

  // 确认前：不写 evidence、不写 person_models（写入只属于 confirmMemoryToDatabase 事务）
  const insightEvidence = await db.select().from(evidence).where(eq(evidence.personId, personId));
  assert.equal(insightEvidence.length, 0);
  const selfEvidence = await db.select().from(evidence).where(eq(evidence.personId, "user_self"));
  assert.equal(selfEvidence.length, 0);
  const models = await db.select().from(personModels).where(eq(personModels.personId, personId));
  assert.equal(models.length, 0);
});

test("confirming a pending insight then promotes evidence and person model through the confirm transaction", async () => {
  const { db } = await import("../src/db/client");
  const { evidence, personModels, memoryCandidates, people } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const { runWorkplaceCRMPipeline } = await import("../src/server/harness/workplace-crm-worker");
  const { confirmMemoryToDatabase } = await import("../src/server/world-model/people-service");

  const personId = `person_crm_promote_${randomUUID().slice(0, 8)}`;
  const sessionId = `sess_crm_${randomUUID().slice(0, 8)}`;
  const llmPayload = {
    persons: [
      {
        personId,
        personName: "燕赤霞",
        observation: "主动接下跨部门协调的脏活",
        inferredPattern: "以担当换影响力的长期主义者",
        framework: "",
        confidence: 0.66,
        rationale: "三次接手他人回避的协调任务",
      },
    ],
    preferences: [],
  };
  const llmBody = JSON.stringify({
    choices: [{ message: { content: JSON.stringify(llmPayload) } }],
  });

  const result = await withMockedFetch(
    async () => new Response(llmBody, { status: 200, headers: { "Content-Type": "application/json" } }),
    () =>
      runWorkplaceCRMPipeline({
        sessionId,
        userMessage: "燕赤霞把跨部门协调的活儿接了",
        assistantReply: "他是可争取的盟友。",
      }),
  );

  const candidateId = result.insights[0].candidateId;
  assert.ok(candidateId);

  // 用户确认 → 事务内晋升：evidence + person_models 出现
  await confirmMemoryToDatabase({
    personId,
    candidateId,
    observation: result.insights[0].observation,
    inferredPattern: result.insights[0].inferredPattern,
    confidence: result.insights[0].confidence,
  });

  const promoted = await db.select().from(memoryCandidates).where(eq(memoryCandidates.id, candidateId));
  assert.equal(promoted[0].status, "confirmed");

  const evRows = await db.select().from(evidence).where(eq(evidence.personId, personId));
  assert.equal(evRows.length, 1);
  const pmRows = await db.select().from(personModels).where(eq(personModels.personId, personId));
  assert.equal(pmRows.length, 1);

  // 人物档案由 pipeline 预先建档（确认事务要求人物存在）
  const personRows = await db.select().from(people).where(eq(people.id, personId));
  assert.equal(personRows.length, 1);
});
