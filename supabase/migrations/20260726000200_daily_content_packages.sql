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
  UNIQUE (brand_id, content_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_content_packages_brand_status
  ON public.daily_content_packages (brand_id, status, content_date DESC);

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
