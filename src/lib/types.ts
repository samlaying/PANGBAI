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

/* ── 项目产物与 YAML Frontmatter 规范 ── */

export type ArtifactType =
  | "prd" // 产品需求文档
  | "solution_brief" // 预期方案与架构
  | "competitive_analysis" // 竞品分析
  | "review_retrospective" // 复盘报告
  | "meeting_notes"; // 会议纪要与备忘

export interface ArtifactYamlFrontmatter {
  title: string;
  type: ArtifactType;
  date: string; // 产出/更新时间 (YYYY-MM-DD)
  progress: "draft" | "in_review" | "aligned" | "completed"; // 进度/阶段
  stakeholders: string[]; // 涉及人 (如 ["王总", "李总", "张明"])
  version?: string; // 版本号 (如 "v2.0-draft")
  expected_solution?: string; // 预期做成什么方案（核心业务解法）
  risk_points?: string[]; // 涉及的潜在风险点
  notes?: string; // 备注说明
  retrospective?: {
    // 复盘专用
    successes: string[];
    friction_points: string[];
    action_items: string[];
  };
}

export interface ProjectArtifact {
  id: string;
  projectId: string;
  title: string;
  frontmatter: ArtifactYamlFrontmatter;
  content: string; // Markdown 正文 (含标准 YAML Frontmatter)
  updatedAt: string;
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
  artifacts?: ProjectArtifact[];
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
  | { kind: "divider" }
  | {
      kind: "artifact_suggestion";
      title: string;
      artifactType: ArtifactType;
      docContent: string;
      description?: string;
    }
  | {
      kind: "memory_candidate";
      candidateId: string;
      personId: string;
      personName: string;
      observation: string;
      pattern: string;
      confidence: number;
      targetScene: string;
      quote?: string;
    };

/* ── 回复元数据 ── */

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** 上游未返回 usage 时按文本长度估算 */
  estimated?: boolean;
}

export type ReplyFeedback = "up" | "down";

export type ChatMessage =
  | { id: string; role: "user"; time: string; text: string }
  | {
      id: string;
      role: "assistant";
      time: string;
      blocks: Block[];
      usage?: TokenUsage;
      feedback?: ReplyFeedback;
    };

/* ── 对话 ── */

export interface ConversationOpener {
  kicker: string;
  title: string;
  standfirst: string;
  metas: string[];
}

export interface Conversation {
  id: string;
  title: string;
  time: string; // 列表显示用：刚刚 / 3天前 / 上周
  group: "今天" | "本周" | "更早";
  opener?: ConversationOpener;
  messages: ChatMessage[];
  projectId?: string; // 关联所属项目（如 "recruiting"）
}

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
