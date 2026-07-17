-- =====================================================================
-- FUNDACAO DAS SKILLS DE IA — rastreio por skill/versao + teto de uso
-- Rodar no SQL Editor do projeto Supabase ativo (ver NEXT_PUBLIC_SUPABASE_URL).
-- Migracao ADITIVA e idempotente (pode rodar mais de uma vez sem apagar dados).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. GENERATION_JOBS: quem pediu e qual skill/versao gerou (PRD §13.8)
--    Reaproveita a tabela de custo existente em vez de criar ai_usage_events.
-- ---------------------------------------------------------------------
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS skill_id      TEXT;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS skill_version INT;

-- O teto de uso conta execucoes por marca+skill dentro do periodo.
CREATE INDEX IF NOT EXISTS idx_generation_jobs_skill
  ON public.generation_jobs (brand_id, skill_id, status, created_at DESC);

-- ---------------------------------------------------------------------
-- 2. AI_LIMITS: os numeros do PRD §12.5 ficam em dados, nao no codigo
--    brand_id NULL = padrao global; linha com brand_id vence o padrao.
--    Skill sem linha nenhuma nao tem limite.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_limits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  skill_id   TEXT NOT NULL,
  period     TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('day', 'month')),
  max_runs   INT  NOT NULL CHECK (max_runs >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uma regra por marca+skill. Em Postgres, NULL nao colide em UNIQUE, entao o
-- padrao global precisa do seu proprio indice parcial.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_limits_brand_skill
  ON public.ai_limits (brand_id, skill_id) WHERE brand_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_limits_global_skill
  ON public.ai_limits (skill_id) WHERE brand_id IS NULL;

-- Recriada aqui de proposito: o historico local nao prova o que existe no banco,
-- e sem a funcao o trigger abaixo derrubaria a migracao inteira.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_limits_updated_at ON public.ai_limits;
CREATE TRIGGER trg_ai_limits_updated_at BEFORE UPDATE ON public.ai_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_limits ENABLE ROW LEVEL SECURITY;

-- Dono le o proprio limite e o padrao global; so o service role escreve.
DROP POLICY IF EXISTS "ai_limits_owner_read" ON public.ai_limits;
CREATE POLICY "ai_limits_owner_read" ON public.ai_limits FOR SELECT
  USING (
    brand_id IS NULL
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = ai_limits.brand_id AND b.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 3. Sem seeds nesta migracao.
--    Os tetos do PRD §12.5 (1 diagnostico, 1 Brand DNA, 1 estrategia, 4 planos
--    semanais, 12 conteudos, 12 regeneracoes, 1 relatorio) entram conforme cada
--    skill nasce — skill_id aqui precisa bater com o id da skill no codigo, e
--    semear antes disso deixaria linhas orfas apontando para nada.
--    Exemplo, quando a skill de diagnostico existir:
--      INSERT INTO public.ai_limits (brand_id, skill_id, period, max_runs)
--      VALUES (NULL, 'instagram-audit', 'month', 1);
-- =====================================================================
-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS public.ai_limits;
--   DROP INDEX IF EXISTS public.idx_generation_jobs_skill;
--   ALTER TABLE public.generation_jobs
--     DROP COLUMN IF EXISTS user_id,
--     DROP COLUMN IF EXISTS skill_id,
--     DROP COLUMN IF EXISTS skill_version;
-- =====================================================================
