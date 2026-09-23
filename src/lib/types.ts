/* ── 世界模型（前端演示用 mock 结构，与 guide.md 数据库设计对应） ── */

export interface PersonPattern {
  pattern: string;
  confidence: number; // 0–100
  evidenceCount: number;
  lastObserved: string;
}

export interface EvidenceItem {
  id: string;
  date: string;
  scene: string;
  source: string;
  person: string;
  project: string;
  record: string; // 原始事件
  observation: string; // AI 提取的观察
  pattern: string;
  patternConfidence: number;
}

export interface RecentEvent {
  date: string;
  text: string;
  today?: boolean;
}

export interface Person {
  id: string;
  name: string;
  char: string;
  role: string;
  org: string;
  relationChip: string;
  tension: number; // 0–100 紧张度
  patterns: PersonPattern[];
  evidence: EvidenceItem[];
  recent: RecentEvent[];
  advice: string;
}

export interface ProjectRisk {
  title: string;
  note: string;
  owner: string;
}

export interface Milestone {
  name: string;
  date: string;
  state: "done" | "warn" | "todo";
}

export interface Project {
  id: string;
  name: string;
  status: string;
  deadline: string;
  progress: number;
  riskCount: number;
  risks: ProjectRisk[];
  milestones: Milestone[];
  members: string[]; // person id，"me" 除外
  advice: string;
}

export interface Meeting {
  title: string;
  when: string;
  duration: string;
  location: string;
  attendees: { personId: string; host?: boolean }[];
  prep: string[];
  relatedProjectId: string;
}

export type NoticeIcon = "risk" | "message" | "calendar";

export interface Notice {
  id: string;
  icon: NoticeIcon;
  title: string;
  body: string;
  time: string;
  primary: string;
  secondary: string;
}

/* ── 对话 ── */

export type Block =
  | { kind: "para"; text: string; dropcap?: boolean }
  | { kind: "quote"; label?: string; text: string }
  | { kind: "actions" }
  | { kind: "source" }
  | { kind: "evidence" }
  | { kind: "divider" };

export type ChatMessage =
  | { id: string; role: "user"; time: string; text: string }
  | { id: string; role: "assistant"; time: string; blocks: Block[] };

/* ── 成长 ── */

export interface GrowthRadarAxis {
  label: string;
  score: number; // 0–5
  prev: number;
}

export interface Growth {
  period: string;
  radar: GrowthRadarAxis[];
  highlights: string[];
  improve: { level: "mid" | "bad"; text: string }[];
  practice: { title: string; desc: string };
}
