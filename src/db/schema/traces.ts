import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { sessions } from "./sessions";

export const llmCallTraces = pgTable("llm_call_traces", {
  id: text("id").primaryKey(),                     // 如 "trace_abc123"
  traceId: text("trace_id").notNull(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  messageId: text("message_id"),
  modelName: text("model_name").notNull(),
  promptTokens: integer("prompt_tokens").default(0),
  completionTokens: integer("completion_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  estimatedCostCny: real("estimated_cost_cny").default(0),
  ttftMs: integer("ttft_ms"),
  totalLatencyMs: integer("total_latency_ms").notNull(),
  status: text("status").notNull().default("success"),
  rawPrompt: text("raw_prompt"),
  rawResponse: text("raw_response"),
  metadataJson: text("metadata_json"),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const projectSearchSnapshots = pgTable("project_search_snapshots", {
  id: text("id").primaryKey(),                     // 如 "search_abc123"
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  intent: text("intent"),
  sourcesJson: text("sources_json").notNull(),     // JSON: Array<{ url, title, snippet }>
  synthesizedInsight: text("synthesized_insight"), // AI 基于搜索总结的核心结论
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
