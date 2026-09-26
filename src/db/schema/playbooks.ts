import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * 职场战法库 (Workplace Playbooks)
 * 来源：127 门实战职场与向上管理、汇报博弈战术体系
 */
export const playbooks = pgTable("playbooks", {
  id: text("id").primaryKey(), // 如 EP033
  title: text("title").notNull(),
  themesJson: text("themes_json").notNull(), // JSON array
  abilitiesJson: text("abilities_json").notNull(), // JSON array
  stageJson: text("stage_json").notNull(), // JSON array
  type: text("type").notNull(), // 框架模型 | 话术清单 | 案例拆解 | 认知心法
  entitiesJson: text("entities_json").notNull(), // JSON array
  useWhen: text("use_when").notNull(), // 人话触发场景
  oneLiner: text("one_liner"), // 一句话核心主张
  situationsJson: text("situations_json"), // JSON array of { situation, action, outcome }
  rulesJson: text("rules_json"), // JSON array of string bullets
  rawContent: text("raw_content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
