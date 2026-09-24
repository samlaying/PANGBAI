import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),                     // 如 "recruitment-agent"
  userId: text("user_id").notNull().default("default_user"),
  name: text("name").notNull(),                    // "招聘 Agent v2"
  status: text("status").notNull().default("in_progress"), // "in_progress" | "risk" | "completed"
  progress: integer("progress").default(0),        // 进度百分比 0-100
  deadline: text("deadline"),                      // "1月31日"
  risksJson: text("risks_json"),                   // JSON: Array<{ id, title, note, syncTarget }>
  milestonesJson: text("milestones_json"),         // JSON: Array<{ name, date, done, isRisk }>
  stakeholdersJson: text("stakeholders_json"),     // JSON: Array<{ id, name, role }>
  advice: text("advice"),                          // 旁白对当前项目的策略建议
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});

export const projectArtifacts = pgTable("project_artifacts", {
  id: text("id").primaryKey(),                     // 如 "art_prd_core"
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),            // 如 "prd-core-solution.md"
  title: text("title").notNull(),                  // 如 "招聘 Agent v2 核心排期与风险兜底方案"
  docType: text("doc_type").notNull().default("prd"), // "prd" | "tech_spec" | "retrospective"
  frontmatterJson: text("frontmatter_json"),       // JSON: parsed YAML frontmatter
  content: text("content").notNull(),              // Markdown 全文内容
  version: text("version").default("v1.0"),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow(),
});
