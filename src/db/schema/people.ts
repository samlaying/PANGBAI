import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const people = sqliteTable("people", {
  id: text("id").primaryKey(),                     // 唯一ID，如 "wang", "li", "zhang"
  userId: text("user_id").notNull().default("default_user"),
  name: text("name").notNull(),                    // "王总"
  role: text("role").notNull(),                    // "CEO"
  department: text("department"),                  // "业务与产品部"
  relationshipTone: text("relationship_tone"),     // "偏紧绷" | "稳定协同" | "技术把关"
  tensionScore: integer("tension_score").default(50), // 关系紧张度 0-100
  advice: text("advice"),                          // 旁白整体策略备忘
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const personModels = sqliteTable("person_models", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(),              // "偏好提前同步风险，极其看重对外交付承诺"
  confidence: real("confidence").notNull(),        // 置信度 (0.0 ~ 1.0)
  evidenceCount: integer("evidence_count").notNull().default(1),
  lastObservedAt: text("last_observed_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  eventId: text("event_id"),                       // 关联的职场事件ID (可空)
  observation: text("observation").notNull(),      // 客观事实观察
  source: text("source").notNull(),                // "周会现场" | "群聊消息" | "1:1 复盘"
  dateStr: text("date_str"),                       // 如 "今天 14:30", "7月8日"
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
