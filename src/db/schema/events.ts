import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),                     // 如 "evt_001"
  userId: text("user_id").notNull().default("default_user"),
  type: text("type").notNull(),                    // "meeting" | "chat" | "review" | "incident"
  title: text("title").notNull(),
  content: text("content").notNull(),              // 原始富文本内容
  personId: text("person_id"),                     // 关联干系人
  projectId: text("project_id"),                   // 关联项目
  metadataJson: text("metadata_json"),             // JSON 扩展字段
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
});
