-- Do not expose application data through Supabase's public API.
-- The Next.js server uses the database connection string and owns authorization.
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Allow all operations%'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

REVOKE ALL ON TABLE
  public.people,
  public.person_models,
  public.evidence,
  public.projects,
  public.project_artifacts,
  public.memory_candidates,
  public.events,
  public.sessions,
  public.messages,
  public.llm_call_traces,
  public.project_search_snapshots
FROM anon, authenticated;
