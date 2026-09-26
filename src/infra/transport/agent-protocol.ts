/**
 * Agent Event Protocol (AG-UI & Event-based Streaming Protocol)
 *
 * 后端 Agent 持续产生结构化 Event，前端作为 Agent Runtime 客户端根据 Event 驱动状态与 Part 渲染。
 */

import type { ArtifactType } from "@/lib/types";

export type AgentEventType =
  | "run.started"
  | "message.delta"
  | "message.final"
  | "thinking.delta"
  | "tool.started"
  | "tool.progress"
  | "tool.result"
  | "artifact.suggested"
  | "memory.candidate"
  | "ui.generative"
  | "run.finished"
  | "run.error";

export type RunStatus = "success" | "aborted" | "failed";

export type RunFinishReason =
  | "stop"
  | "empty_reply"
  | "client_disconnect"
  | "upstream_error"
  | "gate_retry_exhausted";

export interface BaseAgentEvent {
  type: AgentEventType;
  runId?: string;
  timestamp?: number;
}

export interface RunStartedEvent extends BaseAgentEvent {
  type: "run.started";
  sessionId: string;
  messageId: string;
}

export interface MessageDeltaEvent extends BaseAgentEvent {
  type: "message.delta";
  messageId?: string;
  delta: string;
}

export interface MessageFinalEvent extends BaseAgentEvent {
  type: "message.final";
  messageId?: string;
  /** 门禁处理后的权威全文：客户端应以此替换累积的 delta 文本，保证所见 == 落库 */
  text: string;
}

export interface ThinkingDeltaEvent extends BaseAgentEvent {
  type: "thinking.delta";
  delta: string;
}

export interface ToolStartedEvent extends BaseAgentEvent {
  type: "tool.started";
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface ToolProgressEvent extends BaseAgentEvent {
  type: "tool.progress";
  toolCallId: string;
  progress: number;
  statusText?: string;
}

export interface ToolResultEvent extends BaseAgentEvent {
  type: "tool.result";
  toolCallId: string;
  output: unknown;
  status: "success" | "failed";
}

export interface ArtifactSuggestedEvent extends BaseAgentEvent {
  type: "artifact.suggested";
  artifactId?: string;
  title: string;
  artifactType: ArtifactType;
  frontmatter?: Record<string, unknown>;
  content: string;
  description?: string;
}

export interface MemoryCandidateEvent extends BaseAgentEvent {
  type: "memory.candidate";
  candidateId?: string;
  personId: string;
  personName: string;
  pattern: string;
  observation: string;
  confidence: number;
  targetScene?: string;
}

export interface GenerativeUIEvent extends BaseAgentEvent {
  type: "ui.generative";
  componentType: "metric_table" | "timeline_chart" | "risk_matrix" | string;
  props: Record<string, unknown>;
}

export interface RunFinishedEvent extends BaseAgentEvent {
  type: "run.finished";
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** 终态语义：idle != turn success，由服务端按真实信号分类 */
  status?: RunStatus;
  finishReason?: RunFinishReason;
  /** 附带信息，如质量门禁报告 { gate: {...} } */
  metadata?: Record<string, unknown>;
}

export interface RunErrorEvent extends BaseAgentEvent {
  type: "run.error";
  error: string;
  code?: string;
}

export type AgentEvent =
  | RunStartedEvent
  | MessageDeltaEvent
  | MessageFinalEvent
  | ThinkingDeltaEvent
  | ToolStartedEvent
  | ToolProgressEvent
  | ToolResultEvent
  | ArtifactSuggestedEvent
  | MemoryCandidateEvent
  | GenerativeUIEvent
  | RunFinishedEvent
  | RunErrorEvent;
