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
  generated_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  alt_text TEXT,
  recommended_schedule JSONB,
  scheduled_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  generation_started_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_content_packages_brand_date_key UNIQUE (brand_id, content_date)
);

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
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
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
  BEFORE INSERT OR UPDATE OF status ON public.daily_content_packages
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
