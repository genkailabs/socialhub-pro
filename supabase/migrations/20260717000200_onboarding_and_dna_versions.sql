-- =====================================================================
-- ONBOARDING RETOMAVEL (RF-01) + BRAND DNA VERSIONADO (RF-04)
-- Rodar no SQL Editor do projeto Supabase ativo.
-- Migracao ADITIVA e idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ONBOARDING: retomar de onde parou (PRD §13.1)
--    Sem tabela brand_onboarding: brand_kits ja e uma linha por marca e ja
--    absorveu o campo `objective` do wizard. Uma tabela 1:1 so para isto seria
--    um join a mais para guardar tres colunas.
-- ---------------------------------------------------------------------
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS onboarding_step    INT DEFAULT 0;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS onboarding_status  TEXT DEFAULT 'pending'
  CHECK (onboarding_status IN ('pending', 'in_progress', 'completed'));
-- Respostas cruas do wizard, salvas a cada passo. Fechar a aba nao pode custar
-- a entrevista inteira.
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS onboarding_answers JSONB DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------
-- 2. BRAND_DNA_VERSIONS: propor sem sobrescrever o aprovado (PRD §13.3)
--    Hoje cada regeneracao sobrescreve brand_kits e o DNA anterior some.
--    Aqui a IA PROPOE; so a aprovacao do usuario torna uma versao ativa.
--    brand_kits continua sendo o cache da versao ativa, entao todo leitor atual
--    (prompt, autopilot, studio) segue funcionando sem mudanca.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_dna_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  version     INT NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  report      JSONB,
  sources     JSONB,
  status      TEXT NOT NULL DEFAULT 'proposed'
              CHECK (status IN ('proposed', 'approved', 'archived')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Numero de versao sequencial por marca.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dna_versions_brand_version
  ON public.brand_dna_versions (brand_id, version);

-- Uma unica versao aprovada por marca, garantido pelo banco: "qual e o DNA
-- ativo" nao pode depender de a aplicacao lembrar de arquivar a anterior.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dna_versions_one_approved
  ON public.brand_dna_versions (brand_id) WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_dna_versions_brand_created
  ON public.brand_dna_versions (brand_id, created_at DESC);

ALTER TABLE public.brand_dna_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dna_versions_owner_all" ON public.brand_dna_versions;
CREATE POLICY "dna_versions_owner_all" ON public.brand_dna_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_dna_versions.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_dna_versions.brand_id AND b.user_id = auth.uid()));

-- =====================================================================
-- ROLLBACK (manual):
--   DROP TABLE IF EXISTS public.brand_dna_versions;
--   ALTER TABLE public.brand_kits
--     DROP COLUMN IF EXISTS onboarding_step,
--     DROP COLUMN IF EXISTS onboarding_status,
--     DROP COLUMN IF EXISTS onboarding_answers;
-- =====================================================================
