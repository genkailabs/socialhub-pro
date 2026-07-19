-- =====================================================================
-- POSTS.MEDIA_URLS — destrava carrossel, agendamento e cron de publicação
-- Rodar no SQL Editor do projeto Supabase ativo (ver NEXT_PUBLIC_SUPABASE_URL).
-- CONFIRME o email/projeto da conta antes de executar.
-- Migração ADITIVA e idempotente (pode rodar mais de uma vez sem apagar dados).
-- =====================================================================
--
-- Contexto: 20260706_initial_schema.sql declara posts.media_urls, mas a tabela
-- real foi criada sem ela e 20260707_fix_schema_and_rls.sql, que adicionou as
-- demais colunas em uso (content/media_url/networks/scheduled_at), não a incluiu.
-- O código escreve media_urls em lib/posts-actions.js, lib/autopilot.js e lê em
-- app/api/cron/publish-due/route.js, então hoje:
--   - agendar/rascunho/enviar p/ aprovação falham com 42703;
--   - publishNow publica no Instagram e perde o registro do post;
--   - o cron de publicação não enxerga nenhum post vencido.

-- ---------------------------------------------------------------------
-- 1. Coluna do carrossel (media_url segue como a capa / imagem única)
-- ---------------------------------------------------------------------
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------
-- 2. Backfill: posts antigos passam a ter a mídia também na lista.
--    Só toca linhas onde a lista está vazia/nula — não sobrescreve carrossel.
-- ---------------------------------------------------------------------
UPDATE public.posts
   SET media_urls = ARRAY[media_url]
 WHERE media_url IS NOT NULL
   AND media_url <> ''
   AND (media_urls IS NULL OR media_urls = '{}');

-- =====================================================================
-- ROLLBACK (executar manualmente se precisar reverter):
--   ALTER TABLE public.posts DROP COLUMN IF EXISTS media_urls;
-- Perde apenas o carrossel; media_url (capa) permanece intacta.
-- =====================================================================
