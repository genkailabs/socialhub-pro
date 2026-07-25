-- =====================================================================
-- POSTS.COVER_URL
-- Migração ADITIVA e idempotente
-- =====================================================================
-- Contexto: 20260723000100_posts_media_and_retention.sql criou
-- cover_storage_path (caminho no Storage) mas nunca criou cover_url
-- (URL/caminho da capa efetivamente enviada ao Instagram).
--
-- O código grava cover_url em lib/posts-actions.js (publishNow, schedulePost,
-- saveDraft) e lê em lib/publishers/index.js, lib/media-cleanup.js e
-- supabase/functions/publish-due-posts/index.ts. Sem a coluna, o PostgREST
-- rejeita o insert com "Could not find the 'cover_url' column of 'posts'
-- in the schema cache" e o agendamento falha.

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Recarrega o cache de schema do PostgREST para a coluna valer na hora.
NOTIFY pgrst, 'reload schema';

-- Rollback manual (não executar em produção sem checar dependências):
--   ALTER TABLE public.posts DROP COLUMN IF EXISTS cover_url;
