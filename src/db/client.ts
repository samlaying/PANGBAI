import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDatabase = ReturnType<typeof drizzlePg<typeof schema>>;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL;

// 全局缓存避免 Next.js 开发热重载时重复创建连接池
const globalForDb = globalThis as unknown as {
  db: DrizzleDatabase | null;
  client: unknown;
};

let db: DrizzleDatabase;
let client: unknown;

if (globalForDb.db) {
  db = globalForDb.db;
  client = globalForDb.client;
} else if (connectionString) {
  // 1. Supabase 云端 PostgreSQL 连接模式
  const sqlClient = postgres(connectionString, {
    prepare: false, // 必须设为 false 以兼容 Supabase Supavisor Transaction Pooler (端口 6543)
    max: process.env.NODE_ENV === "production" ? 10 : 2,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  client = sqlClient;
  db = drizzlePg(sqlClient, { schema });
} else {
  // 2. 本地未配置 DATABASE_URL 时（如本地离线测试环境）：平滑使用内嵌 PGlite（纯内存 PostgreSQL 兼容引擎）
  // 语法、类型与 Supabase 保持 100% 一致
  const pgliteInstance = new PGlite();
  client = pgliteInstance;
  db = drizzlePglite(pgliteInstance, { schema }) as unknown as DrizzleDatabase;

  pgliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      relationship_tone TEXT,
      tension_score INTEGER DEFAULT 50,
      advice TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS person_models (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      pattern TEXT NOT NULL,
      confidence REAL NOT NULL,
      evidence_count INTEGER NOT NULL DEFAULT 1,
      last_observed_at TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      event_id TEXT,
      observation TEXT NOT NULL,
      source TEXT NOT NULL,
      date_str TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      progress INTEGER DEFAULT 0,
      deadline TEXT,
      risks_json TEXT,
      milestones_json TEXT,
      stakeholders_json TEXT,
      advice TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS project_artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL DEFAULT 'prd',
      frontmatter_json TEXT,
      content TEXT NOT NULL,
      version TEXT DEFAULT 'v1.0',
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS memory_candidates (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      observation TEXT NOT NULL,
      inferred_pattern TEXT NOT NULL,
      confidence REAL NOT NULL,
      rationale TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      person_id TEXT,
      project_id TEXT,
      metadata_json TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((err: unknown) => {
    console.warn("[PANGBAI Supabase] PGlite 初始化提示:", err);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
  globalForDb.client = client;
}

export { db, client };
