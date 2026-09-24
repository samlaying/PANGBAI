import { test } from "node:test";
import assert from "node:assert/strict";

test("a fresh database has the tables required by the API", async () => {
  const { db } = await import("../src/db/client");
  const { people, projects, projectArtifacts, personModels, evidence, memoryCandidates, sessions, messages, llmCallTraces, projectSearchSnapshots } = await import("../src/db/schema");
  assert.ok(db);
  assert.ok(people);
  assert.ok(projects);
  assert.ok(projectArtifacts);
  assert.ok(personModels);
  assert.ok(evidence);
  assert.ok(memoryCandidates);
  assert.ok(sessions);
  assert.ok(messages);
  assert.ok(llmCallTraces);
  assert.ok(projectSearchSnapshots);
});

test("fresh runtime contains no demo people or projects", async () => {
  const { db } = await import("../src/db/client");
  const { people, projects } = await import("../src/db/schema");
  const peopleList = await db.select().from(people);
  const projectsList = await db.select().from(projects);
  assert.equal(peopleList.length, 0);
  assert.equal(projectsList.length, 0);
});

test("project and artifact routes persist data that can be read back", async () => {
  const { POST: createProject, GET: getProjects } = await import("../src/app/api/projects/route");
  const created = await createProject(new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "真实项目", deadline: "2026-10-01" }),
  }) as never);
  assert.equal(created.status, 201);
  const project = await created.json();
  const listed = await (await getProjects()).json();
  assert.equal(listed[0].id, project.id);

  const { POST: createArtifact } = await import("../src/app/api/artifacts/route");
  const artifactResponse = await createArtifact(new Request("http://localhost/api/artifacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: project.id, content: "---\ntitle: 测试文档\ntype: prd\n---\n正文" }),
  }) as never);
  assert.equal(artifactResponse.status, 201);
  const artifact = await artifactResponse.json();
  const { PUT: updateArtifact, GET: getArtifact } = await import("../src/app/api/artifacts/[id]/route");
  const context = { params: Promise.resolve({ id: artifact.id }) };
  const updated = await updateArtifact(new Request(`http://localhost/api/artifacts/${artifact.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "---\ntitle: 测试文档\ntype: prd\n---\n已保存" }),
  }) as never, context);
  assert.equal(updated.status, 200);
  assert.match((await (await getArtifact(new Request("http://localhost") as never, context)).json()).content, /已保存/);
});

test("confirming a candidate twice records one evidence item", async () => {
  const { db } = await import("../src/db/client");
  const { people, memoryCandidates, evidence } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  await db.insert(people).values({ id: "person-1", name: "同事", role: "同事" });
  await db.insert(memoryCandidates).values({
    id: "candidate-1",
    personId: "person-1",
    observation: "观察",
    inferredPattern: "模式",
    confidence: 0.8,
    status: "pending",
  });
  const { confirmMemoryToDatabase } = await import("../src/server/world-model/people-service");
  const input = { personId: "person-1", candidateId: "candidate-1", observation: "观察", inferredPattern: "模式", confidence: 0.8 };
  await confirmMemoryToDatabase(input);
  await confirmMemoryToDatabase(input);
  const evList = await db.select().from(evidence).where(eq(evidence.personId, "person-1"));
  assert.equal(evList.length, 1);
});

test("unknown memory candidate cannot create evidence", async () => {
  const { db } = await import("../src/db/client");
  const { evidence } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const { confirmMemoryToDatabase } = await import("../src/server/world-model/people-service");
  const before = await db.select().from(evidence).where(eq(evidence.personId, "person-1"));
  await assert.rejects(confirmMemoryToDatabase({
    personId: "person-1", candidateId: "missing", observation: "未确认观察", inferredPattern: "未确认规律", confidence: 0.8,
  }));
  const afterList = await db.select().from(evidence).where(eq(evidence.personId, "person-1"));
  assert.equal(afterList.length, before.length);
});

test("people route creates a real person without demo defaults", async () => {
  const { POST: createPerson, GET: getPeople } = await import("../src/app/api/people/route");
  const response = await createPerson(new Request("http://localhost/api/people", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "新同事", role: "设计师" }),
  }) as never);
  assert.equal(response.status, 201);
  const person = await response.json();
  assert.ok(person.id);
  const listed = await (await getPeople()).json();
  assert.ok(listed.some((item: { id: string }) => item.id === person.id));
});

test("coach context has no hard-coded demo identity or project", async () => {
  const { assembleCoachContext } = await import("../src/server/agent/context-assembler");
  const prompt = await assembleCoachContext();
  assert.doesNotMatch(prompt, /张明|王总|招聘 Agent/);
});

test("chat stream preserves SSE events split across network chunks", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.SILICONFLOW_API_KEY;
  process.env.SILICONFLOW_API_KEY = "test-key";
  const event = 'data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n';
  const encoder = new TextEncoder();
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(event.slice(0, 25)));
      controller.enqueue(encoder.encode(event.slice(25, 45)));
      controller.enqueue(encoder.encode(event.slice(45)));
      controller.close();
    },
  }));
  try {
    const { POST } = await import("../src/app/api/chat/route");
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "你好" }] }),
    }) as never);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "你好");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.SILICONFLOW_API_KEY;
    else process.env.SILICONFLOW_API_KEY = previousKey;
  }
});

test("sessions and messages persist under project_id with evidence causality", async () => {
  const { db } = await import("../src/db/client");
  const { projects, sessions, messages, evidence, people } = await import("../src/db/schema");
  const { eq } = await import("drizzle-orm");

  const projId = "proj_test_1";
  await db.insert(projects).values({ id: projId, name: "供应链升级项目", status: "in_progress" });

  // 1. 会话与消息持久化
  const sessId = "sess_test_1";
  await db.insert(sessions).values({ id: sessId, projectId: projId, title: "关于王总催排期的讨论" });
  await db.insert(messages).values({
    id: "msg_test_1",
    sessionId: sessId,
    projectId: projId,
    role: "user",
    partsJson: JSON.stringify([{ type: "text", text: "王总今天在群里催排期" }]),
    timestampStr: "刚刚",
  });

  const savedSess = await db.select().from(sessions).where(eq(sessions.projectId, projId));
  assert.equal(savedSess.length, 1);
  assert.equal(savedSess[0].title, "关于王总催排期的讨论");

  const savedMsgs = await db.select().from(messages).where(eq(messages.sessionId, sessId));
  assert.equal(savedMsgs.length, 1);
  assert.match(savedMsgs[0].partsJson, /王总今天在群里催排期/);

  // 2. 带有项目与因果归因的证据持久化
  const personId = "person_wang_test";
  await db.insert(people).values({ id: personId, name: "王总", role: "CEO" });
  await db.insert(evidence).values({
    id: "ev_test_1",
    personId,
    projectId: projId,
    observation: "群内直接当众催问进度",
    rationale: "被动知情打乱其掌控节奏，对排期变更极度敏感",
    inferredPatternId: "pat_risk_advance",
    source: "群聊消息",
    dateStr: "今天",
  });

  const savedEv = await db.select().from(evidence).where(eq(evidence.projectId, projId));
  assert.equal(savedEv.length, 1);
  assert.equal(savedEv[0].rationale, "被动知情打乱其掌控节奏，对排期变更极度敏感");
  assert.equal(savedEv[0].inferredPatternId, "pat_risk_advance");
});

test("assembleCoachContext injects workspace profile with name, industry and coaching style", async () => {
  const { assembleCoachContext } = await import("../src/server/agent/context-assembler");
  const prompt = await assembleCoachContext({
    profile: {
      name: "智能硬件产研中心",
      industry: "hardware",
      style: "sharp",
      isInitialized: true,
    },
  });

  assert.match(prompt, /智能硬件产研中心/);
  assert.match(prompt, /消费电子 \/ 智能硬件/);
  assert.match(prompt, /犀利实战型/);
  assert.match(prompt, /供应链试产/);
  assert.match(prompt, /一针见血/);
});
