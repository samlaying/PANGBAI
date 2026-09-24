import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects, projectArtifacts } from "./projects";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),                     // 如 "sess_abc123"
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("新对话"),
  sessionType: text("session_type").notNull().default("coaching"), // "coaching" | "rehearsal" | "upward_prep" | "review"
  activeCanvasId: text("active_canvas_id").references(() => projectArtifacts.id, { onDelete: "set null" }),
  metadataJson: text("metadata_json"),             // JSON 扩展元数据 (如聚焦的人选、预置标签)
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),                     // 如 "msg_abc123"
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull(),                    // "user" | "assistant" | "system"
  partsJson: text("parts_json").notNull(),         // JSON: Array<MessagePart>
  timestampStr: text("timestamp_str"),             // "刚刚" 或时间
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
