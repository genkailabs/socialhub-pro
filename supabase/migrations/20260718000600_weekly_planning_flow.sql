-- =====================================================================
-- FLUXO SEMANAL DE PLANEJAMENTO: metadados estrategicos e estados novos
-- Migracao aditiva e idempotente.
-- =====================================================================

ALTER TABLE public.editorial_plans
  ADD COLUMN IF NOT EXISTS weekly_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.editorial_plan_items
  ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hook TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration TEXT,
  ADD COLUMN IF NOT EXISTS regeneration_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_error TEXT;

ALTER TABLE public.editorial_plan_items
  DROP CONSTRAINT IF EXISTS editorial_plan_items_status_check;

UPDATE public.editorial_plan_items
SET status = CASE status
  WHEN 'proposed' THEN 'idea'
  WHEN 'produced' THEN 'ready'
  ELSE status
END
WHERE status IN ('proposed', 'produced');

ALTER TABLE public.editorial_plan_items
  ALTER COLUMN status SET DEFAULT 'idea',
  ADD CONSTRAINT editorial_plan_items_status_check
    CHECK (status IN ('idea', 'approved', 'in_production', 'ready', 'rejected'));

-- Versoes permitem restaurar uma ideia trocada sem nova chamada de IA.
CREATE TABLE IF NOT EXISTS public.editorial_plan_item_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_item_id UUID REFERENCES public.editorial_plan_items(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL,
  objective TEXT,
  summary TEXT NOT NULL DEFAULT '',
  hook TEXT NOT NULL DEFAULT '',
  cta TEXT,
  target_audience TEXT,
  estimated_duration TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editorial_plan_item_versions_item_version_key UNIQUE (planning_item_id, version_number)
);

-- Uma restauração precisa devolver o item inteiro, não apenas o texto visível.
-- IF NOT EXISTS também atualiza bases onde a primeira versão da migração já rodou.
ALTER TABLE public.editorial_plan_item_versions
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS pillar TEXT,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS rationale TEXT;

CREATE INDEX IF NOT EXISTS idx_plan_item_versions_item
  ON public.editorial_plan_item_versions (planning_item_id, version_number DESC);

ALTER TABLE public.editorial_plan_item_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_item_versions_owner_all" ON public.editorial_plan_item_versions;
CREATE POLICY "plan_item_versions_owner_all" ON public.editorial_plan_item_versions FOR ALL
  USING (EXISTS (
    SELECT 1
    FROM public.editorial_plan_items i
    JOIN public.editorial_plans p ON p.id = i.plan_id
    JOIN public.brands b ON b.id = p.brand_id
    WHERE i.id = editorial_plan_item_versions.planning_item_id
      AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.editorial_plan_items i
    JOIN public.editorial_plans p ON p.id = i.plan_id
    JOIN public.brands b ON b.id = p.brand_id
    WHERE i.id = editorial_plan_item_versions.planning_item_id
      AND b.user_id = auth.uid()
  ));
