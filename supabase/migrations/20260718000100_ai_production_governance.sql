-- PRD 6: pacotes de producao, limites por plano e auditoria interna.
-- Os valores vivem em dados, nunca em constantes do produto.

CREATE TABLE IF NOT EXISTS public.ai_plan_limits (
  plan_key TEXT PRIMARY KEY,
  productions_per_month INT NOT NULL CHECK (productions_per_month >= 0),
  images_per_content INT NOT NULL CHECK (images_per_content >= 0 AND images_per_content <= 4),
  research_policy TEXT NOT NULL DEFAULT 'limited' CHECK (research_policy IN ('none', 'limited', 'included')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_plan_limits (plan_key, productions_per_month, images_per_content, research_policy)
VALUES
  ('essencial', 8, 2, 'limited'),
  ('profissional', 20, 4, 'included'),
  ('agencia', 100, 4, 'included')
ON CONFLICT (plan_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.brand_ai_plans (
  brand_id UUID PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL REFERENCES public.ai_plan_limits(plan_key),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_production_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- A organizacao atual e a conta dona da marca; deixamos este campo para a
  -- futura tabela de organizacoes sem perder os registros existentes.
  organization_id UUID,
  -- Sem FK aqui: esta migracao pode rodar antes da migracao da recomendacao.
  recommendation_id UUID,
  plan_key TEXT NOT NULL,
  image_limit INT NOT NULL DEFAULT 0,
  image_count INT NOT NULL DEFAULT 0,
  research_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS recommendation_id UUID;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS production_package_id UUID REFERENCES public.ai_production_packages(id) ON DELETE SET NULL;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS image_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS research_performed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS retry_attempt INT NOT NULL DEFAULT 1;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS charged BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ai_production_packages_usage
  ON public.ai_production_packages (brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_package
  ON public.generation_jobs (production_package_id, created_at DESC);

ALTER TABLE public.ai_plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_ai_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_production_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_plan_limits_read" ON public.ai_plan_limits;
CREATE POLICY "ai_plan_limits_read" ON public.ai_plan_limits FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "brand_ai_plans_owner_all" ON public.brand_ai_plans;
CREATE POLICY "brand_ai_plans_owner_all" ON public.brand_ai_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_ai_plans.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_ai_plans.brand_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "ai_production_packages_owner_read" ON public.ai_production_packages;
CREATE POLICY "ai_production_packages_owner_read" ON public.ai_production_packages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = ai_production_packages.brand_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "ai_production_packages_owner_insert" ON public.ai_production_packages;
CREATE POLICY "ai_production_packages_owner_insert" ON public.ai_production_packages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = ai_production_packages.brand_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "ai_production_packages_owner_update" ON public.ai_production_packages;
CREATE POLICY "ai_production_packages_owner_update" ON public.ai_production_packages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = ai_production_packages.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = ai_production_packages.brand_id AND b.user_id = auth.uid()));
