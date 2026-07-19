-- Agendamento interno: pg_cron chama Edge Functions, sem Railway/Next.js.
-- Antes de aplicar, crie no Vault: scheduler_project_url e scheduler_service_role_key.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publishing_started_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publish_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS last_publish_error TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS external_post_id TEXT;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_status_check CHECK (status IN (
  'draft', 'awaiting_approval', 'waiting_approval', 'scheduled', 'publishing',
  'published', 'failed', 'cancelled', 'error', 'ready_to_post', 'posted_manually'
));

CREATE INDEX IF NOT EXISTS idx_posts_due_for_publication
  ON public.posts (status, scheduled_at) WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS public.publication_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'error', 'summary')),
  duration_ms INT,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publication_job_logs_run ON public.publication_job_logs (run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publication_job_logs_post ON public.publication_job_logs (post_id, created_at DESC);
ALTER TABLE public.publication_job_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "publication_job_logs_owner_read" ON public.publication_job_logs;
CREATE POLICY "publication_job_logs_owner_read" ON public.publication_job_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.posts p JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = publication_job_logs.post_id AND b.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.claim_due_posts(batch_size INT DEFAULT 10, max_attempts INT DEFAULT 3)
RETURNS SETOF public.posts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.posts
    WHERE status = 'scheduled'
      AND scheduled_at <= now()
      AND publish_attempts < max_attempts
    ORDER BY scheduled_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(batch_size, 50))
  )
  UPDATE public.posts p
     SET status = 'publishing',
         publishing_started_at = now(),
         publish_attempts = p.publish_attempts + 1,
         last_publish_error = NULL,
         publication_attempted_at = now()
    FROM due
   WHERE p.id = due.id
  RETURNING p.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_due_posts(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_posts(INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.recover_stuck_publications(max_attempts INT DEFAULT 3)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed INT;
BEGIN
  UPDATE public.posts
     SET status = CASE WHEN publish_attempts >= max_attempts THEN 'failed' ELSE 'scheduled' END,
         last_publish_error = COALESCE(last_publish_error, 'Publicacao interrompida; reprogramada automaticamente.'),
         publishing_started_at = NULL
   WHERE status = 'publishing'
     AND publishing_started_at < now() - interval '15 minutes';
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;
REVOKE ALL ON FUNCTION public.recover_stuck_publications(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_stuck_publications(INT) TO service_role;

-- Configure os dois secrets via Dashboard/Vault antes desta migracao:
-- scheduler_project_url = https://<project-ref>.supabase.co
-- scheduler_service_role_key = service_role key do projeto
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('publish-due-posts-every-5-minutes', 'youtube-sync-daily');
SELECT cron.schedule(
  'publish-due-posts-every-5-minutes',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduler_project_url') || '/functions/v1/publish-due-posts',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduler_service_role_key')),
    body := '{}'::jsonb
  );$$
);
SELECT cron.schedule(
  'youtube-sync-daily',
  '15 3 * * *',
  $$SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduler_project_url') || '/functions/v1/youtube-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduler_service_role_key')),
    body := '{}'::jsonb
  );$$
);
