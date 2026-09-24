import { db } from "@/db/client";
import { people, personModels, evidence } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sqlite } from "@/db/client";
import { randomUUID } from "node:crypto";

export async function getPeopleWithDetails() {
  const allPeople = await db.select().from(people);
  const result = [];

  for (const p of allPeople) {
    const models = await db
      .select()
      .from(personModels)
      .where(eq(personModels.personId, p.id));

    const evidences = await db
      .select()
      .from(evidence)
      .where(eq(evidence.personId, p.id))
      .orderBy(desc(evidence.createdAt));

    result.push({
      ...p,
      models: models.map((m) => ({
        id: m.id,
        pattern: m.pattern,
        confidence: Math.round(m.confidence * 100),
        evidenceCount: m.evidenceCount,
        lastObservedAt: m.lastObservedAt,
      })),
      evidence: evidences.map((e) => ({
        id: e.id,
        date: e.dateStr || "近期",
        source: e.source,
        text: e.observation,
      })),
    });
  }

  return result;
}

export async function getPersonById(personId: string) {
  const p = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!p || p.length === 0) return null;

  const person = p[0];
  const models = await db
    .select()
    .from(personModels)
    .where(eq(personModels.personId, person.id));

  const evidences = await db
    .select()
    .from(evidence)
    .where(eq(evidence.personId, person.id))
    .orderBy(desc(evidence.createdAt));

  return {
    ...person,
    models: models.map((m) => ({
      id: m.id,
      pattern: m.pattern,
      confidence: Math.round(m.confidence * 100),
      evidenceCount: m.evidenceCount,
      lastObservedAt: m.lastObservedAt,
    })),
    evidence: evidences.map((e) => ({
      id: e.id,
      date: e.dateStr || "近期",
      source: e.source,
      text: e.observation,
    })),
  };
}

export interface ConfirmMemoryInput {
  personId: string;
  candidateId?: string;
  observation: string;
  inferredPattern: string;
  confidence: number; // 0.0 - 1.0 或 0 - 100
  source?: string;
}

/**
 * 人机协同单键沉淀：将 AI 预填的候选规律与证据原子化落入数据库
 */
export async function confirmMemoryToDatabase(input: ConfirmMemoryInput) {
  const { personId, candidateId, observation, inferredPattern, source = "对话提炼沉淀" } = input;
  const rawConfidence = Number(input.confidence > 1 ? input.confidence / 100 : input.confidence);
  if (!personId || !observation.trim() || !inferredPattern.trim() || !Number.isFinite(rawConfidence) || rawConfidence < 0 || rawConfidence > 1) {
    throw new Error("Invalid memory confirmation");
  }

  sqlite.transaction(() => {
    const person = sqlite.prepare("SELECT id FROM people WHERE id = ?").get(personId);
    if (!person) throw new Error("Person not found");

    if (candidateId) {
      const candidate = sqlite.prepare("SELECT status FROM memory_candidates WHERE id = ? AND person_id = ?")
        .get(candidateId, personId) as { status: string } | undefined;
      if (!candidate || candidate.status === "ignored") throw new Error("Memory candidate not found or ignored");
      if (candidate.status === "confirmed") return;
      const result = sqlite.prepare("UPDATE memory_candidates SET status = 'confirmed' WHERE id = ? AND person_id = ? AND status = 'pending'")
        .run(candidateId, personId);
      if (result.changes === 0) throw new Error("Memory candidate is not pending");
    }

    sqlite.prepare("INSERT INTO evidence (id, person_id, observation, source, date_str) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), personId, observation.trim(), source, new Date().toISOString());
    const existing = sqlite.prepare("SELECT id, confidence, evidence_count FROM person_models WHERE person_id = ? AND pattern = ?")
      .get(personId, inferredPattern.trim()) as { id: string; confidence: number; evidence_count: number } | undefined;
    if (existing) {
      sqlite.prepare("UPDATE person_models SET confidence = ?, evidence_count = ?, last_observed_at = ? WHERE id = ?")
        .run(Math.min(0.98, Math.max(existing.confidence, rawConfidence) + 0.03), existing.evidence_count + 1, new Date().toISOString(), existing.id);
    } else {
      sqlite.prepare("INSERT INTO person_models (id, person_id, pattern, confidence, evidence_count, last_observed_at) VALUES (?, ?, ?, ?, 1, ?)")
        .run(randomUUID(), personId, inferredPattern.trim(), rawConfidence, new Date().toISOString());
    }
    sqlite.prepare("UPDATE people SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), personId);
  })();

  return getPersonById(personId);
}
