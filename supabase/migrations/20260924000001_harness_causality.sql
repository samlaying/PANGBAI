-- ==============================================================================
-- 旁白 (PANGBAI) 迁移脚本: Harness 业务加工与因果推断三元组支持
-- 1. 项目级会话与消息持久化 (sessions, messages)
-- 2. 证据因果字段升级 (evidence: project_id, rationale, inferred_pattern_id)
-- 3. 记忆候选项目字段升级 (memory_candidates: project_id)
-- 4. 链路追踪与搜索沉淀 (llm_call_traces, project_search_snapshots)
-- ==============================================================================

-- 1. 项目专属对话会话表 (sessions)
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
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON public.sessions(project_id);

-- 2. 对话消息明细表 (messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    parts_json TEXT NOT NULL,
    timestamp_str TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);
CREATE INDEX IF NOT EXISTS idx_messages_project_session ON public.messages(project_id, session_id);

-- 3. 升级证据链表 (evidence) 增加因果字段
ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS rationale TEXT;
ALTER TABLE public.evidence ADD COLUMN IF NOT EXISTS inferred_pattern_id TEXT;
CREATE INDEX IF NOT EXISTS idx_evidence_project_id ON public.evidence(project_id);

-- 4. 升级记忆候选表 (memory_candidates) 增加项目关联
ALTER TABLE public.memory_candidates ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_memory_candidates_project_id ON public.memory_candidates(project_id);

-- 5. AI 调用追踪与计量表 (llm_call_traces)
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
CREATE INDEX IF NOT EXISTS idx_traces_project_id ON public.llm_call_traces(project_id);
CREATE INDEX IF NOT EXISTS idx_traces_session_id ON public.llm_call_traces(session_id);

-- 6. 项目级外部搜索与参考资料沉淀表 (project_search_snapshots)
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
CREATE INDEX IF NOT EXISTS idx_search_project_id ON public.project_search_snapshots(project_id);

-- 7. 启用 RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_call_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_search_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for service role and public on sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public on messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public on traces" ON public.llm_call_traces FOR ALL USING (true);
CREATE POLICY "Allow all operations for service role and public on search_snapshots" ON public.project_search_snapshots FOR ALL USING (true);
