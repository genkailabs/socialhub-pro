-- =====================================================================
-- PRODUCAO DE CONTEUDO (PRD Etapas 10/11 e §5.1)
-- Rodar no SQL Editor do projeto Supabase ativo.
-- Migracao ADITIVA e idempotente.
-- =====================================================================
--
-- Reaproveita a tabela posts em vez de criar uma nova: o post produzido e o
-- mesmo objeto que o calendario mostra, a aprovacao aprova e o cron publica.
-- Uma tabela paralela obrigaria a sincronizar duas fontes sobre a mesma coisa.

-- ---------------------------------------------------------------------
-- 1. Colunas de producao
-- ---------------------------------------------------------------------
-- Formato do registro (lib/formats.js): image | carousel | reel | stories.
-- Diferente de media_type, que descreve o arquivo, nao a intencao editorial.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS format TEXT;

-- Saida da skill produtora, por formato: hook/slides no post, cards no stories,
-- cenas no reel. JSONB porque o shape varia com o formato e quem garante a
-- estrutura e o Zod na borda, nao o banco.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS production JSONB;

-- Saida da skill de revisao: veredito, problemas, motivos de revisao humana.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS review JSONB;

-- ---------------------------------------------------------------------
-- 2. Estados novos para formato nao publicavel (§5.1)
--    Reels e Stories nao passam por agendamento nem publicacao automatica:
--    o usuario posta e confirma. O sistema nao pode dizer que publicou o que
--    nao publicou.
-- ---------------------------------------------------------------------
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check
  CHECK (status IN (
    'draft',
    'waiting_approval',
    'scheduled',
    'published',
    'error',
    'ready_to_post',    -- roteiro/sequencia entregue; o usuario posta
    'posted_manually'   -- o usuario confirmou que postou
  ));

-- ---------------------------------------------------------------------
-- 3. Backfill: posts antigos sao imagem ou carrossel conforme a midia.
--    Sem isso o publicador nao saberia o que fazer com o que ja existe.
-- ---------------------------------------------------------------------
UPDATE public.posts
   SET format = CASE
     WHEN media_urls IS NOT NULL AND array_length(media_urls, 1) > 1 THEN 'carousel'
     ELSE 'image'
   END
 WHERE format IS NULL;

-- O calendario e a fila de publicacao filtram por formato + status.
CREATE INDEX IF NOT EXISTS idx_posts_format_status
  ON public.posts (brand_id, format, status);

-- =====================================================================
-- ROLLBACK (manual):
--   ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
--   ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
--     CHECK (status IN ('draft','waiting_approval','scheduled','published','error'));
--   DROP INDEX IF EXISTS public.idx_posts_format_status;
--   ALTER TABLE public.posts
--     DROP COLUMN IF EXISTS format,
--     DROP COLUMN IF EXISTS production,
--     DROP COLUMN IF EXISTS review;
-- =====================================================================
