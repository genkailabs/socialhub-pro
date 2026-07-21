-- =====================================================================
-- INSTAGRAM_AUDITS — diagnostico do perfil (PRD Etapa 4 / §13.2)
-- Rodar no SQL Editor do projeto Supabase ativo.
-- Migracao ADITIVA e idempotente.
-- =====================================================================
--
-- Guarda cada diagnostico como um registro imutavel: o snapshot que veio da
-- Meta, o que o codigo calculou e o que a IA concluiu ficam separados de
-- proposito. Assim da para reinterpretar um diagnostico antigo com uma versao
-- nova da skill sem chamar a Meta de novo, e para auditar se a IA afirmou algo
-- que os numeros nao sustentavam.

CREATE TABLE IF NOT EXISTS public.instagram_audits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  -- perfil + midia crus, como a Meta devolveu
  source_snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- saida de buildAuditSummary (frequencia, formatos, ranking, horarios)
  calculated_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- saida da skill instagram-audit
  ai_analysis        JSONB,
  confidence         TEXT CHECK (confidence IN ('baixa', 'media', 'alta')),
  -- metricas do Insights que a Meta nao entregou nesta coleta
  unavailable        TEXT[] DEFAULT '{}',
  skill_version      INT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- O acesso normal e "o ultimo diagnostico desta marca".
CREATE INDEX IF NOT EXISTS idx_instagram_audits_brand
  ON public.instagram_audits (brand_id, created_at DESC);

ALTER TABLE public.instagram_audits ENABLE ROW LEVEL SECURITY;

-- Mesmo padrao das demais tabelas filhas de brands.
DROP POLICY IF EXISTS "instagram_audits_owner_read" ON public.instagram_audits;
CREATE POLICY "instagram_audits_owner_read" ON public.instagram_audits FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = instagram_audits.brand_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "instagram_audits_owner_insert" ON public.instagram_audits;
CREATE POLICY "instagram_audits_owner_insert" ON public.instagram_audits FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = instagram_audits.brand_id AND b.user_id = auth.uid()));

-- =====================================================================
-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS public.instagram_audits;
-- =====================================================================
