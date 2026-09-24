import type { Person, Project, ProjectArtifact } from "./types";

type JsonRecord = Record<string, unknown>;
const object = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const string = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function mapPerson(value: unknown): Person {
  const p = object(value);
  const name = string(p.name);
  return {
    id: string(p.id),
    name,
    char: name.slice(0, 1) || "人",
    role: string(p.role),
    org: string(p.department),
    relationChip: string(p.relationshipTone),
    tension: number(p.tensionScore, 50),
    advice: string(p.advice),
    recent: [],
    patterns: array(p.models).map((raw) => {
      const m = object(raw);
      return {
        pattern: string(m.pattern),
        confidence: number(m.confidence),
        evidenceCount: number(m.evidenceCount),
        lastObserved: string(m.lastObservedAt),
      };
    }),
    evidence: array(p.evidence).map((raw) => {
      const e = object(raw);
      const observation = string(e.text || e.observation);
      const rationale = string(e.rationale);
      return {
        id: string(e.id),
        date: string(e.date || e.dateStr),
        scene: string(e.source),
        source: string(e.source),
        person: name,
        project: string(e.projectId || "当前聚焦项目"),
        record: rationale ? `${observation}（推断动机：${rationale}）` : observation,
        observation,
        pattern: string(e.inferredPattern || e.pattern),
        patternConfidence: number(e.confidence || e.patternConfidence, 85),
      };
    }),
  };
}

export function mapArtifact(value: unknown): ProjectArtifact {
  const art = object(value);
  return {
    id: string(art.id),
    projectId: string(art.projectId),
    title: string(art.title),
    content: string(art.content),
    updatedAt: string(art.updatedAt),
    frontmatter: object(art.frontmatter) as unknown as ProjectArtifact["frontmatter"],
  };
}

export function mapProject(value: unknown): Project {
  const p = object(value);
  const risks = array(p.risks).map((raw) => {
    const r = object(raw);
    return {
      title: string(r.title),
      note: string(r.note),
      owner: string(r.syncTarget, string(r.owner)),
    };
  });
  return {
    id: string(p.id),
    name: string(p.name),
    status: string(p.status),
    deadline: string(p.deadline, "未定"),
    progress: number(p.progress),
    riskCount: risks.length,
    risks,
    advice: string(p.advice),
    milestones: array(p.milestones).map((raw) => {
      const m = object(raw);
      return {
        name: string(m.name),
        date: string(m.date),
        state: m.done ? ("done" as const) : m.isRisk ? ("warn" as const) : ("todo" as const),
      };
    }),
    members: array(p.stakeholders)
      .map((raw) => (typeof raw === "string" ? raw : string(object(raw).id)))
      .filter(Boolean),
    artifacts: array(p.artifacts).map(mapArtifact),
  };
}
