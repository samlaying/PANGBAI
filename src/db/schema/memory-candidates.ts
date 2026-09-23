import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { people } from "./people";

export const memoryCandidates = sqliteTable("memory_candidates", {
  id: text("id").primaryKey(),                     // 如 "cand_123"
  conversationId: text("conversation_id"),
  personId: text("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  observation: text("observation").notNull(),      // AI 预填事实观察
  inferredPattern: text("inferred_pattern").notNull(), // AI 归纳的 Pattern
  confidence: real("confidence").notNull(),        // 置信度 (0.0 ~ 1.0)
  rationale: text("rationale"),                    // 判定理由
  status: text("status").notNull().default("pending"), // "pending" | "confirmed" | "dismissed"
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
