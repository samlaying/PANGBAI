import type Database from "better-sqlite3";

export function migrateDatabase(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      relationship_tone TEXT,
      tension_score INTEGER DEFAULT 50,
      advice TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS person_models (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      pattern TEXT NOT NULL,
      confidence REAL NOT NULL,
      evidence_count INTEGER NOT NULL DEFAULT 1,
      last_observed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      event_id TEXT,
      observation TEXT NOT NULL,
      source TEXT NOT NULL,
      date_str TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
