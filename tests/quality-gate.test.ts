import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { QualityGate, headGateCheck, isDocSkill } from "../src/server/harness/quality-gate";
import { parseFrontmatter, hasFrontmatterBlock } from "../src/server/artifacts/frontmatter";

// ------------------------------------------------------------ headGateCheck

test("headGateCheck passes text beginning with the frontmatter delimiter", () => {
  assert.deepEqual(headGateCheck('---\ntitle: "x"\n---\n正文'), { decision: "pass" });
  assert.deepEqual(headGateCheck('  \n--- \ntitle: "x"'), { decision: "pass" });
});

test("headGateCheck buffers while the delimiter is still completing", () => {
  assert.deepEqual(headGateCheck(""), { decision: "buffer" });
  assert.deepEqual(headGateCheck(" "), { decision: "buffer" });
  assert.deepEqual(headGateCheck("-"), { decision: "buffer" });
  assert.deepEqual(headGateCheck("--"), { decision: "buffer" });
  assert.deepEqual(headGateCheck("---"), { decision: "buffer" });
  assert.deepEqual(headGateCheck("--- \t"), { decision: "buffer" });
});

test("headGateCheck flags violation when a preamble precedes frontmatter", () => {
  const verdict = headGateCheck("好的，下面是方案：\n---\ntitle: x");
  assert.equal(verdict.decision, "violation");
});

test("headGateCheck flags dash-adjacent text that can never form the delimiter", () => {
  assert.equal(headGateCheck("-你好").decision, "violation");
  assert.equal(headGateCheck("----\n正文").decision, "violation");
  assert.equal(headGateCheck("--短横线开头\n").decision, "violation");
});

// ------------------------------------------------------------- isDocSkill

test("isDocSkill recognizes the two frontmatter-constrained skills only", () => {
  assert.equal(isDocSkill("prd_generator"), true);
  assert.equal(isDocSkill("canvas_doc_writer"), true);
  assert.equal(isDocSkill("direct_chat"), false);
  assert.equal(isDocSkill(undefined), false);
});

// ----------------------------------------------------------- processOutput

test("processOutput injects frontmatter for a doc-skill reply missing it", () => {
  const { text, report } = QualityGate.processOutput("# 项目方案\n正文", { activeSkill: "prd_generator" });
  assert.ok(hasFrontmatterBlock(text));
  // 契约一致性回归：门禁修复后的文本必须能被服务端解析器真正提取
  const parsed = parseFrontmatter(text);
  assert.equal(parsed.frontmatter.title, "项目方案.md");
  assert.equal(parsed.frontmatter.type, "prd");
  assert.ok(report.violations.some((v) => v.kind === "frontmatter_missing"));
  assert.ok(report.repairs.some((r) => r.kind === "frontmatter_injected"));
});

test("processOutput treats frontmatter-after-preamble as a violation and repairs it", () => {
  const raw = '好的，下面是方案：\n---\ntitle: "方案"\ntype: "prd"\n---\n# 正文';
  const { text, report } = QualityGate.processOutput(raw, { activeSkill: "prd_generator" });
  assert.ok(
    report.violations.some((v) => v.kind === "frontmatter_not_at_start"),
    "preamble-before-frontmatter must be flagged (old /m regex let it slip)",
  );
  const parsed = parseFrontmatter(text);
  assert.equal(parsed.frontmatter.title, "方案");
});

test("processOutput leaves non-doc skills untouched even without frontmatter", () => {
  const raw = "普通建议正文";
  const { text, report } = QualityGate.processOutput(raw, { activeSkill: "direct_chat" });
  assert.equal(text, raw);
  assert.equal(report.violations.length, 0);
});

test("processOutput passes through clean doc-skill output with an empty report", () => {
  const raw = '---\ntitle: "方案.md"\ntype: "prd"\n---\n# 正文';
  const { text, report } = QualityGate.processOutput(raw, { activeSkill: "prd_generator" });
  assert.equal(text, raw);
  assert.equal(report.violations.length, 0);
  assert.equal(report.repairs.length, 0);
});

test("processOutput strips mentor-analysis prefixes from quote blocks and reports it", () => {
  const raw = "> 我认为，领导这个方案可以推进。\n\n正文";
  const { text, report } = QualityGate.processOutput(raw);
  assert.doesNotMatch(text, /我认为/);
  assert.match(text, /^> 领导这个方案可以推进。$/m);
  assert.ok(report.violations.some((v) => v.kind === "quote_prefix"));
  assert.ok(report.repairs.some((r) => r.kind === "quote_stripped"));
});

test("processOutput backfills person links for known people and reports it", () => {
  const raw = "王总今天催排期，王总态度强硬。";
  const { text, report } = QualityGate.processOutput(raw, {
    knownPeople: [{ id: "p1", name: "王总" }],
  });
  assert.equal(text.match(/\[王总]\(person:p1\)/g)?.length, 2);
  assert.ok(report.violations.some((v) => v.kind === "person_link_unlinked"));
  assert.ok(report.repairs.some((r) => r.kind === "person_link_backfilled"));
});

test("processOutput does not double-link already linked people", () => {
  const raw = "已经链接过的 [王总](person:p1) 不会被重复处理。";
  const { text } = QualityGate.processOutput(raw, {
    knownPeople: [{ id: "p1", name: "王总" }],
  });
  assert.equal(text.match(/\[王总]/g)?.length, 1);
});

// ---------------------------------------------- route-level head gate & retry

interface UpstreamScript {
  events: string[];
  opts?: { errorAfter?: Error; hangAfter?: boolean };
}

function sseUpstreamSequence(scripts: UpstreamScript[]) {
  let call = 0;
  const encoder = new TextEncoder();
  return async (_url: unknown, init?: RequestInit) => {
    const script = scripts[Math.min(call++, scripts.length - 1)];
    let idx = 0;
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            controller.error(init.signal?.reason ?? new Error("aborted"));
          });
        },
        pull(controller) {
          if (idx < script.events.length) {
            controller.enqueue(encoder.encode(script.events[idx++]));
            return;
          }
          if (script.opts?.errorAfter) {
            controller.error(script.opts.errorAfter);
          } else if (!script.opts?.hangAfter) {
            controller.close();
          }
        },
      }),
    );
  };
}

interface StreamEvent {
  type: string;
  status?: string;
  finishReason?: string;
  delta?: string;
  text?: string;
  metadata?: { gate?: { retried?: boolean; violations?: Array<{ kind: string }> } };
}

async function runChat(fetchMock: unknown, userText: string) {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SILICONFLOW_API_KEY;
  process.env.SILICONFLOW_API_KEY = "test-key";
  globalThis.fetch = fetchMock as typeof fetch;
  const sessionId = `sess_gate_${randomUUID().slice(0, 8)}`;
  try {
    const { POST } = await import("../src/app/api/chat/route");
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [{ role: "user", content: userText }],
        }),
      }) as never,
    );
    assert.equal(response.status, 200);
    const streamText = await response.text();
    const events = streamText
      .split("\n\n")
      .filter(Boolean)
      .map((block) => JSON.parse(block.match(/^data: (.+)$/m)?.[1] || "{}") as StreamEvent);
    return { events, sessionId };
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SILICONFLOW_API_KEY;
    else process.env.SILICONFLOW_API_KEY = previousKey;
  }
}

function delta(content: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

test("head-gate violation triggers one corrective retry and the violating text never reaches the client", async () => {
  // 首次：开场白违约；重试：合规 frontmatter
  const { events } = await runChat(
    sseUpstreamSequence([
      { events: [delta("好的，这是一份PRD："), delta("更多正文")] },
      {
        events: [
          delta('---\ntitle: "需求方案.md"\ntype: "prd"\nexpected_solution: "统一方案"\n---\n'),
          delta("# 正文"),
          'data: [DONE]\n\n',
        ],
      },
    ]),
    "请帮我写一份PRD需求文档",
  );

  // 违约开场白绝不能出现在任何 delta 或终稿里
  for (const e of events) {
    if (e.type === "message.delta") assert.doesNotMatch(e.delta ?? "", /好的，这是一份PRD/);
    if (e.type === "message.final") assert.doesNotMatch(e.text ?? "", /好的，这是一份PRD/);
  }
  // 重试成功：无 run.error，终态 stop，报告标记已重试
  assert.equal(events.some((e) => e.type === "run.error"), false);
  const finished = events.find((e) => e.type === "run.finished");
  assert.ok(finished);
  assert.equal(finished.status, "success");
  assert.equal(finished.finishReason, "stop");
  assert.equal(finished.metadata?.gate?.retried, true);
  // artifact 从重试输出中正常唤起
  assert.ok(events.some((e) => e.type === "artifact.suggested"));
});

test("chat preserves a final SSE data line that has no trailing newline", async () => {
  const { events } = await runChat(
    sseUpstreamSequence([{ events: [delta("最后一段").replace(/\n\n$/, "")] }]),
    "请给我一句简短建议",
  );

  assert.ok(events.some((event) => event.type === "message.delta" && event.delta === "最后一段"));
});

test("retry-exhausted output falls back to synthetic repair with a degraded success verdict", async () => {
  // 两次都违约
  const { events } = await runChat(
    sseUpstreamSequence([
      { events: [delta("我认为应该先讨论需求。"), "data: [DONE]\n\n"] },
      { events: [delta("再次没有 frontmatter 的输出。"), "data: [DONE]\n\n"] },
    ]),
    "请帮我写一份PRD需求文档",
  );

  const finished = events.find((e) => e.type === "run.finished");
  assert.ok(finished);
  assert.equal(finished.status, "success");
  assert.equal(finished.finishReason, "gate_retry_exhausted");
  assert.ok(
    finished.metadata?.gate?.violations?.some((v) => v.kind === "frontmatter_missing"),
    "final gate report must record the remaining violation",
  );
  // 回退修复：message.final 携带合成 frontmatter 的终稿，artifact 仍被唤起
  const finalEvent = events.find((e) => e.type === "message.final");
  assert.ok(finalEvent?.text?.startsWith("---\n"));
  assert.ok(events.some((e) => e.type === "artifact.suggested"));
});
