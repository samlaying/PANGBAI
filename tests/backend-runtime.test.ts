import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalCwd = process.cwd();
const dataDir = mkdtempSync(join(tmpdir(), "pangbai-runtime-"));
process.chdir(dataDir);

after(() => {
  process.chdir(originalCwd);
  rmSync(dataDir, { recursive: true, force: true });
});

test("a fresh database has the tables required by the API", async () => {
  const { sqlite } = await import("../src/db/client");
  const names = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as { name: string }[];
  for (const name of ["people", "projects", "project_artifacts", "person_models", "evidence", "memory_candidates"]) {
    assert.ok(names.some((table) => table.name === name), `${name} missing`);
  }
});

test("fresh runtime contains no demo people or projects", async () => {
  const { sqlite } = await import("../src/db/client");
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS count FROM people").get() as { count: number }).count, 0);
  assert.equal((sqlite.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number }).count, 0);
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
  const { sqlite } = await import("../src/db/client");
  sqlite.prepare("INSERT INTO people (id, name, role) VALUES (?, ?, ?)").run("person-1", "同事", "同事");
  sqlite.prepare("INSERT INTO memory_candidates (id, person_id, observation, inferred_pattern, confidence) VALUES (?, ?, ?, ?, ?)")
    .run("candidate-1", "person-1", "观察", "模式", 0.8);
  const { confirmMemoryToDatabase } = await import("../src/server/world-model/people-service");
  const input = { personId: "person-1", candidateId: "candidate-1", observation: "观察", inferredPattern: "模式", confidence: 0.8 };
  await confirmMemoryToDatabase(input);
  await confirmMemoryToDatabase(input);
  const count = sqlite.prepare("SELECT COUNT(*) AS count FROM evidence WHERE person_id = ?").get("person-1") as { count: number };
  assert.equal(count.count, 1);
});

test("unknown memory candidate cannot create evidence", async () => {
  const { sqlite } = await import("../src/db/client");
  const { confirmMemoryToDatabase } = await import("../src/server/world-model/people-service");
  const before = sqlite.prepare("SELECT COUNT(*) AS count FROM evidence WHERE person_id = ?").get("person-1") as { count: number };
  await assert.rejects(confirmMemoryToDatabase({
    personId: "person-1", candidateId: "missing", observation: "未确认观察", inferredPattern: "未确认规律", confidence: 0.8,
  }));
  const afterCount = sqlite.prepare("SELECT COUNT(*) AS count FROM evidence WHERE person_id = ?").get("person-1") as { count: number };
  assert.equal(afterCount.count, before.count);
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
