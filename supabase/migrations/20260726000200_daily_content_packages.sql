-- Pacotes diários revisáveis. Esta migration é somente aditiva e não cria posts.
CREATE TABLE IF NOT EXISTS public.daily_content_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  content_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'approved', 'scheduled', 'failed')),
  topic TEXT,
  goal TEXT,
  format TEXT,
  reason TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  alt_text TEXT,
  recommended_schedule JSONB,
  scheduled_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  generation_started_at TIMESTAMPTZ,
  claim_token UUID,
  claim_heartbeat_at TIMESTAMPTZ,
  claim_expires_at TIMESTAMPTZ,
  cleanup_pending_paths TEXT[] NOT NULL DEFAULT '{}',
  cleanup_error TEXT,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_content_packages_brand_date_key UNIQUE (brand_id, content_date)
);

-- Reexecução segura sobre tabela criada por uma aplicação parcial/manual.
ALTER TABLE public.daily_content_packages
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS claim_token UUID,
  ADD COLUMN IF NOT EXISTS claim_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claim_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cleanup_pending_paths TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cleanup_error TEXT;

-- CREATE TABLE IF NOT EXISTS não corrige uma tabela criada parcialmente à mão.
-- A constraint nomeada torna drift visível (inclusive duplicatas preexistentes)
-- em vez de deixar a garantia de idempotência silenciosamente ausente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_content_packages_brand_date_key'
      AND conrelid = 'public.daily_content_packages'::regclass
  ) THEN
    ALTER TABLE public.daily_content_packages
      ADD CONSTRAINT daily_content_packages_brand_date_key
      UNIQUE (brand_id, content_date);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_daily_content_packages_brand_status
  ON public.daily_content_packages (brand_id, status, content_date DESC);

-- O RLS controla quem pode escrever; este trigger controla quais mudanças de
-- estado até o dono pode fazer pela API direta.
CREATE OR REPLACE FUNCTION public.enforce_daily_content_package_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'daily content packages must start as draft' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status IN ('ready', 'approved', 'scheduled') THEN
    IF NULLIF(btrim(NEW.topic), '') IS NULL
      OR NULLIF(btrim(NEW.goal), '') IS NULL
      OR NULLIF(btrim(NEW.format), '') IS NULL
      OR NULLIF(btrim(NEW.reason), '') IS NULL
      OR jsonb_typeof(NEW.generated_content) <> 'object'
      OR NEW.generated_content = '{}'::jsonb
      OR cardinality(NEW.media_urls) = 0
      OR NULLIF(btrim(NEW.alt_text), '') IS NULL
      OR jsonb_typeof(NEW.evidence) <> 'object'
      OR NEW.evidence = '{}'::jsonb
      OR (NEW.evidence->>'kind' = 'verified-research'
        AND (jsonb_typeof(NEW.sources) <> 'array' OR jsonb_array_length(NEW.sources) = 0)) THEN
      RAISE EXCEPTION 'ready daily content package is incomplete' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status IN ('approved', 'scheduled') THEN
    IF NEW.approved_at IS NULL
      OR NEW.approved_by IS NULL
      OR (auth.uid() IS NOT NULL AND NEW.approved_by <> auth.uid()) THEN
      RAISE EXCEPTION 'approved daily content package lacks approval audit' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status = 'scheduled'
    AND (NEW.scheduled_at IS NULL
      OR ((TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'scheduled'
        OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at)
        AND NEW.scheduled_at <= now())) THEN
    RAISE EXCEPTION 'scheduled daily content package requires a future schedule' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'draft' AND NEW.status IN ('ready', 'failed')
    AND (OLD.claim_token IS NULL OR NEW.claim_token IS NOT NULL) THEN
    RAISE EXCEPTION 'claim ownership is required to finish generation' USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'failed' AND NEW.status = 'draft'
    AND (NEW.claim_token IS NULL
      OR NEW.claim_heartbeat_at IS NULL
      OR NEW.claim_expires_at IS NULL
      OR NEW.claim_expires_at <= now()
      OR cardinality(NEW.cleanup_pending_paths) <> 0) THEN
    RAISE EXCEPTION 'retry requires a clean live claim' USING ERRCODE = '23514';
  END IF;

  IF (OLD.status = 'draft' AND NEW.status IN ('ready', 'failed'))
    OR (OLD.status = 'failed' AND NEW.status = 'draft')
    OR (OLD.status = 'ready' AND NEW.status = 'approved')
    OR (OLD.status = 'approved' AND NEW.status = 'scheduled') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid daily content package transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS daily_content_packages_enforce_transition
  ON public.daily_content_packages;
CREATE TRIGGER daily_content_packages_enforce_transition
  BEFORE INSERT OR UPDATE ON public.daily_content_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_daily_content_package_transition();

ALTER TABLE public.daily_content_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_content_packages_owner_all" ON public.daily_content_packages;
CREATE POLICY "daily_content_packages_owner_all"
  ON public.daily_content_packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = daily_content_packages.brand_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = daily_content_packages.brand_id
        AND b.user_id = auth.uid()
    )
  );

-- Permite limpar somente os assets duráveis criados pelo gerador diário.
-- O caminho deve ser <brand_uuid>/daily/<claim_uuid>/ai-<timestamp>-<index>.<png|jpg>
-- e a marca precisa pertencer ao usuário autenticado. O namespace exclusivo
-- impede que esta policy alcance assets genéricos do AI Studio/Autopilot.
DROP POLICY IF EXISTS "daily_content_package_ai_media_delete" ON storage.objects;
CREATE POLICY "daily_content_package_ai_media_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media'
    AND cardinality(storage.foldername(name)) = 3
    AND (storage.foldername(name))[2] = 'daily'
    AND (storage.foldername(name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND storage.filename(name) ~ '^ai-[0-9]+-[0-9]+\.(png|jpg)$'
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND b.user_id = auth.uid()
    )
  );
