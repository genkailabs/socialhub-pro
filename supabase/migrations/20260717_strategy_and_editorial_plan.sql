-- =====================================================================
-- ESTRATEGIA DE CONTEUDO (§13.4) + PLANO EDITORIAL (§13.5/§13.6)
-- Rodar no SQL Editor do projeto Supabase ativo.
-- Migracao ADITIVA e idempotente.
-- =====================================================================
--
-- Por que tabelas novas e nao content_plans:
-- content_plans e a configuracao do piloto (cadencia, formato, pilares, horarios)
-- e continua viva como tal. Estrategia tem periodo, objetivos, indicadores e
-- ciclo de aprovacao proprio; plano editorial tem itens que viram posts. Sao
-- ciclos de vida diferentes — enfiar tudo numa linha por marca faria a
-- estrategia do mes passado sumir quando a proxima fosse gerada, que e
-- exatamente o problema que o Brand DNA versionado acabou de resolver.

-- ---------------------------------------------------------------------
-- 1. CONTENT_STRATEGIES — o "porque publicar" antes do "o que publicar"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_strategies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  objectives    JSONB NOT NULL DEFAULT '{}'::jsonb,
  pillars       JSONB NOT NULL DEFAULT '[]'::jsonb,
  formats       JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency     JSONB NOT NULL DEFAULT '{}'::jsonb,
  indicators    JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale     TEXT,
  status        TEXT NOT NULL DEFAULT 'proposed'
                CHECK (status IN ('proposed', 'approved', 'archived')),
  skill_version INT,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT periodo_valido CHECK (period_end >= period_start)
);

-- Mesma garantia do Brand DNA: uma estrategia ativa por marca, no banco.
CREATE UNIQUE INDEX IF NOT EXISTS idx_strategies_one_approved
  ON public.content_strategies (brand_id) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_strategies_brand
  ON public.content_strategies (brand_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 2. EDITORIAL_PLANS — a semana planejada
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES public.content_strategies(id) ON DELETE SET NULL,
  week_start  DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'proposed'
              CHECK (status IN ('proposed', 'approved', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Uma semana nao pode ter dois planos concorrentes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_brand_week
  ON public.editorial_plans (brand_id, week_start);

-- ---------------------------------------------------------------------
-- 3. EDITORIAL_PLAN_ITEMS — os temas; so o aprovado vira conteudo (RF-07)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_plan_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID REFERENCES public.editorial_plans(id) ON DELETE CASCADE NOT NULL,
  -- preenchido quando o tema aprovado vira post de verdade
  post_id    UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  date       DATE NOT NULL,
  format     TEXT NOT NULL DEFAULT 'news',
  topic      TEXT NOT NULL,
  title      TEXT,
  objective  TEXT,
  pillar     TEXT,
  stage      TEXT,
  cta        TEXT,
  rationale  TEXT,
  status     TEXT NOT NULL DEFAULT 'proposed'
             CHECK (status IN ('proposed', 'approved', 'rejected', 'produced')),
  position   INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan
  ON public.editorial_plan_items (plan_id, date, position);

-- ---------------------------------------------------------------------
-- 4. updated_at automatico
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_strategies_updated_at ON public.content_strategies;
CREATE TRIGGER trg_strategies_updated_at BEFORE UPDATE ON public.content_strategies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_plan_items_updated_at ON public.editorial_plan_items;
CREATE TRIGGER trg_plan_items_updated_at BEFORE UPDATE ON public.editorial_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. RLS — mesmo padrao das demais tabelas filhas de brands.
--    Os itens sao netos: a posse vem pelo plano.
-- ---------------------------------------------------------------------
ALTER TABLE public.content_strategies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strategies_owner_all" ON public.content_strategies;
CREATE POLICY "strategies_owner_all" ON public.content_strategies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = content_strategies.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = content_strategies.brand_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "plans_owner_all" ON public.editorial_plans;
CREATE POLICY "plans_owner_all" ON public.editorial_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = editorial_plans.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = editorial_plans.brand_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "plan_items_owner_all" ON public.editorial_plan_items;
CREATE POLICY "plan_items_owner_all" ON public.editorial_plan_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.editorial_plans p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = editorial_plan_items.plan_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.editorial_plans p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = editorial_plan_items.plan_id AND b.user_id = auth.uid()
  ));

-- =====================================================================
-- ROLLBACK (manual, nesta ordem por causa das FKs):
--   DROP TABLE IF EXISTS public.editorial_plan_items;
--   DROP TABLE IF EXISTS public.editorial_plans;
--   DROP TABLE IF EXISTS public.content_strategies;
-- =====================================================================
