import { db } from "@/db/client";
import { people, personModels, evidence, memoryCandidates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export async function getPeopleWithDetails() {
  const [allPeople, allModels, allEvidences] = await Promise.all([
    db.select().from(people),
    db.select().from(personModels),
    db.select().from(evidence).orderBy(desc(evidence.createdAt)),
  ]);

  const modelsByPerson = new Map<string, typeof allModels>();
  for (const m of allModels) {
    const list = modelsByPerson.get(m.personId) || [];
    list.push(m);
    modelsByPerson.set(m.personId, list);
  }

  const evidenceByPerson = new Map<string, typeof allEvidences>();
  for (const e of allEvidences) {
    const list = evidenceByPerson.get(e.personId) || [];
    list.push(e);
    evidenceByPerson.set(e.personId, list);
  }

  return allPeople.map((p) => {
    const models = modelsByPerson.get(p.id) || [];
    const evidences = evidenceByPerson.get(p.id) || [];

    return {
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
        observation: e.observation,
        rationale: e.rationale,
        projectId: e.projectId,
        inferredPatternId: e.inferredPatternId,
      })),
    };
  });
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
      observation: e.observation,
      rationale: e.rationale,
      projectId: e.projectId,
      inferredPatternId: e.inferredPatternId,
    })),
  };
}

export interface ConfirmMemoryInput {
  personId: string;
  candidateId?: string;
  projectId?: string;
  observation: string;
  rationale?: string;
  inferredPattern: string;
  confidence: number; // 0.0 - 1.0 或 0 - 100
  source?: string;
}

/**
 * 人机协同单键沉淀：将 AI 预填的候选规律与证据原子化落入数据库
 */
export async function confirmMemoryToDatabase(input: ConfirmMemoryInput) {
  const { personId, candidateId, projectId, observation, rationale, inferredPattern, source = "对话提炼沉淀" } = input;
  const rawConfidence = Number(input.confidence > 1 ? input.confidence / 100 : input.confidence);
  if (!personId || !observation.trim() || !inferredPattern.trim() || !Number.isFinite(rawConfidence) || rawConfidence < 0 || rawConfidence > 1) {
    throw new Error("Invalid memory confirmation");
  }

  await db.transaction(async (tx) => {
    const p = await tx.select({ id: people.id }).from(people).where(eq(people.id, personId)).limit(1);
    if (!p || p.length === 0) throw new Error("Person not found");

    if (candidateId) {
      const candidates = await tx
        .select({ status: memoryCandidates.status })
        .from(memoryCandidates)
        .where(eq(memoryCandidates.id, candidateId))
        .limit(1);
      const candidate = candidates[0];
      if (!candidate || candidate.status === "ignored") throw new Error("Memory candidate not found or ignored");
      if (candidate.status === "confirmed") return;
      await tx
        .update(memoryCandidates)
        .set({ status: "confirmed" })
        .where(eq(memoryCandidates.id, candidateId));
    }

    await tx.insert(evidence).values({
      id: randomUUID(),
      personId,
      projectId,
      observation: observation.trim(),
      rationale,
      source,
      dateStr: "刚刚",
    });

    const existingModels = await tx
      .select({
        id: personModels.id,
        confidence: personModels.confidence,
        evidenceCount: personModels.evidenceCount,
        pattern: personModels.pattern,
      })
      .from(personModels)
      .where(eq(personModels.personId, personId));
    const existing = existingModels.find((m) => m.pattern === inferredPattern.trim());

    if (existing) {
      await tx
        .update(personModels)
        .set({
          confidence: Math.min(0.98, Math.max(existing.confidence, rawConfidence) + 0.03),
          evidenceCount: existing.evidenceCount + 1,
          lastObservedAt: "刚刚",
        })
        .where(eq(personModels.id, existing.id));
    } else {
      await tx.insert(personModels).values({
        id: randomUUID(),
        personId,
        pattern: inferredPattern.trim(),
        confidence: rawConfidence,
        evidenceCount: 1,
        lastObservedAt: new Date().toISOString(),
      });
    }

    await tx
      .update(people)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(people.id, personId));
  });

  return getPersonById(personId);
}
