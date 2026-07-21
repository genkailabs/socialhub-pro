-- ============================================================
-- Fase 2/3 — Motor de conteúdo IA (Brand Kit, Piloto, custos)
-- ============================================================

-- posts: tipo de mídia (image | carousel | video)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- ------------------------------------------------------------
-- Brand Kit: DNA da marca usado pela IA para gerar on-brand
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_kits (
  brand_id   UUID PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
  niche      TEXT,
  audience   TEXT,
  tone       TEXT,
  pillars    TEXT[] DEFAULT '{}',
  dos        TEXT[] DEFAULT '{}',
  donts      TEXT[] DEFAULT '{}',
  palette    JSONB  DEFAULT '{}'::jsonb,
  logo_url   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brand_kits_owner_all" ON public.brand_kits;
CREATE POLICY "brand_kits_owner_all" ON public.brand_kits FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_kits.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_kits.brand_id AND b.user_id = auth.uid()));

-- ------------------------------------------------------------
-- Piloto automático: config de geração diária por marca
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_plans (
  brand_id        UUID PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
  active          BOOLEAN DEFAULT FALSE,
  posts_per_day   INT DEFAULT 1,
  format          TEXT DEFAULT 'quote',
  pillars         TEXT[] DEFAULT '{}',
  preferred_times TEXT[] DEFAULT '{}',
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_plans_owner_all" ON public.content_plans;
CREATE POLICY "content_plans_owner_all" ON public.content_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = content_plans.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = content_plans.brand_id AND b.user_id = auth.uid()));

-- ------------------------------------------------------------
-- Log de geração (transparência de custo real — núcleo honesto)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'post',
  provider      TEXT NOT NULL DEFAULT 'deepseek',
  model         TEXT,
  input_tokens  INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cost_usd      NUMERIC(12,6) DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  ref_post_id   UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_generation_jobs_brand ON public.generation_jobs (brand_id, created_at DESC);
-- dono lê os próprios jobs; a escrita vem de server actions (service role ignora RLS)
DROP POLICY IF EXISTS "generation_jobs_owner_read" ON public.generation_jobs;
CREATE POLICY "generation_jobs_owner_read" ON public.generation_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = generation_jobs.brand_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS "generation_jobs_owner_insert" ON public.generation_jobs;
CREATE POLICY "generation_jobs_owner_insert" ON public.generation_jobs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = generation_jobs.brand_id AND b.user_id = auth.uid()));
