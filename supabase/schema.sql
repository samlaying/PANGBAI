-- ==============================================================================
-- 旁白（PANGBAI）— Supabase 生产/开发数据库初始化脚本 (PostgreSQL DDL)
-- 适用范围：Supabase SQL Editor 一键执行 或 Supabase CLI 迁移
-- ==============================================================================

-- 启用必要的扩展（如全文检索扩展、UUID 生成）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 职场干系人档案表 (people)
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  relationship_tone TEXT,
  tension_score INTEGER DEFAULT 50,
  advice TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. 行为心理模型表 (person_models)
CREATE TABLE IF NOT EXISTS public.person_models (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  confidence REAL NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 1,
  last_observed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 3. 客观行为证据链表 (evidence)
CREATE TABLE IF NOT EXISTS public.evidence (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  event_id TEXT,
  observation TEXT NOT NULL,
  rationale TEXT,
  inferred_pattern_id TEXT,
  source TEXT NOT NULL,
  date_str TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. 真实项目表 (projects)
CREATE TABLE IF NOT EXISTS public.projects (
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
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Canvas Markdown 活文档产物表 (project_artifacts)
CREATE TABLE IF NOT EXISTS public.project_artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'prd',
  frontmatter_json TEXT,
  content TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 6. 人机协同记忆候选表 (memory_candidates)
CREATE TABLE IF NOT EXISTS public.memory_candidates (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  observation TEXT NOT NULL,
  inferred_pattern TEXT NOT NULL,
  confidence REAL NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 7. 职场事件全文索引表 (events)
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default_user',
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  personId TEXT,
  projectId TEXT,
  metadata_json TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 8. 项目专属对话会话表 (sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新对话',
  session_type TEXT NOT NULL DEFAULT 'coaching',
  active_canvas_id TEXT REFERENCES public.project_artifacts(id) ON DELETE SET NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 9. 对话消息明细表 (messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parts_json TEXT NOT NULL,
  timestamp_str TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 10. AI 调用追踪与计量表 (llm_call_traces)
CREATE TABLE IF NOT EXISTS public.llm_call_traces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  trace_id TEXT NOT NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE,
  message_id TEXT,
  model_name TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_cny REAL DEFAULT 0,
  ttft_ms INTEGER,
  total_latency_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  raw_prompt TEXT,
  raw_response TEXT,
  metadata_json TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 11. 项目级外部搜索与参考资料沉淀表 (project_search_snapshots)
CREATE TABLE IF NOT EXISTS public.project_search_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  intent TEXT,
  sources_json TEXT NOT NULL,
  synthesized_insight TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 创建索引以确保极佳的查询性能
CREATE INDEX IF NOT EXISTS idx_person_models_person_id ON public.person_models(person_id);
CREATE INDEX IF NOT EXISTS idx_evidence_person_id ON public.evidence(person_id);
CREATE INDEX IF NOT EXISTS idx_evidence_project_id ON public.evidence(project_id);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_project_id ON public.project_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_candidates_person_id ON public.memory_candidates(person_id);
CREATE INDEX IF NOT EXISTS idx_memory_candidates_project_id ON public.memory_candidates(project_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON public.sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_session ON public.messages(project_id, session_id);
CREATE INDEX IF NOT EXISTS idx_traces_project_id ON public.llm_call_traces(project_id);
CREATE INDEX IF NOT EXISTS idx_search_project_id ON public.project_search_snapshots(project_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_call_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_search_snapshots ENABLE ROW LEVEL SECURITY;

-- 允许匿名/服务端 API 访问的默认策略（可按需根据 Supabase Auth 强化）
CREATE POLICY "Allow all operations for service role and public" ON public.people FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.person_models FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.evidence FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.project_artifacts FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.memory_candidates FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.events FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.llm_call_traces FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public" ON public.project_search_snapshots FOR ALL USING (true);

