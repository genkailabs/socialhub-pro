-- Fila durável para mídias órfãs da geração diária. Ela não depende do estado
-- nem do claim do pacote que originou o asset.
CREATE TABLE IF NOT EXISTS public.daily_content_cleanup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  last_error TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_content_cleanup_jobs_brand_path_key
    UNIQUE (brand_id, storage_path),
  CONSTRAINT daily_content_cleanup_jobs_daily_asset_check CHECK (
    storage_path ~* (
      '^' || brand_id::text
      || '/daily/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
      || '/ai-[0-9]+-[0-9]+\.(png|jpg)$'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_daily_content_cleanup_jobs_brand_created
  ON public.daily_content_cleanup_jobs (brand_id, created_at);

ALTER TABLE public.daily_content_cleanup_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_content_cleanup_jobs_owner_all"
  ON public.daily_content_cleanup_jobs;
CREATE POLICY "daily_content_cleanup_jobs_owner_all"
  ON public.daily_content_cleanup_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = daily_content_cleanup_jobs.brand_id
        AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = daily_content_cleanup_jobs.brand_id
        AND b.user_id = auth.uid()
    )
  );
