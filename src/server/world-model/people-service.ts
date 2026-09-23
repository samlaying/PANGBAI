import { db } from "@/db/client";
import { people, personModels, evidence, memoryCandidates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
  const rawConfidence = input.confidence > 1 ? input.confidence / 100 : input.confidence;

  // 1. 若有 candidateId，更新 candidate 状态为 confirmed
  if (candidateId) {
    await db
      .update(memoryCandidates)
      .set({ status: "confirmed" })
      .where(eq(memoryCandidates.id, candidateId));
  }

  // 2. 插入新证据记录
  const newEvidenceId = `ev_${Date.now()}`;
  await db.insert(evidence).values({
    id: newEvidenceId,
    personId,
    observation,
    source,
    dateStr: "刚刚 16:30",
  });

  // 3. 检查该人物是否已有相似或相同 Pattern
  const existingModels = await db
    .select()
    .from(personModels)
    .where(eq(personModels.personId, personId));

  const matchedModel = existingModels.find(
    (m) =>
      m.pattern.includes(inferredPattern) ||
      inferredPattern.includes(m.pattern) ||
      (m.pattern.includes("保底") && inferredPattern.includes("保底"))
  );

  if (matchedModel) {
    // 贝叶斯式累加：证据数量 +1，微调置信度
    const newCount = matchedModel.evidenceCount + 1;
    const newConfidence = Math.min(0.98, Math.max(matchedModel.confidence, rawConfidence) + 0.03);

    await db
      .update(personModels)
      .set({
        pattern: inferredPattern, // 用更精确的表述更新
        confidence: newConfidence,
        evidenceCount: newCount,
        lastObservedAt: "刚刚",
      })
      .where(eq(personModels.id, matchedModel.id));
  } else {
    // 插入全新提炼的 Pattern
    await db.insert(personModels).values({
      id: `pm_${personId}_${Date.now()}`,
      personId,
      pattern: inferredPattern,
      confidence: rawConfidence,
      evidenceCount: 1,
      lastObservedAt: "刚刚",
    });
  }

  // 4. 更新人物实体的修改时间
  await db
    .update(people)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(people.id, personId));

  return await getPersonById(personId);
}
