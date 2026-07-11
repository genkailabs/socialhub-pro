-- Setup de aprovação externa no projeto geoqbbrlyepmhwgdbjmz.
-- No geoq faltavam a tabela approval_comments E a RPC de token (a 20260707 foi
-- escrita para o projeto antigo). Este script cria tudo, idempotente.

-- 1. Tabela de comentários/decisões de aprovação
CREATE TABLE IF NOT EXISTS public.approval_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  action_taken TEXT CHECK (action_taken IN ('approved', 'changes_requested', 'comment_only')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

-- 2. RLS: comentário externo só em post existente; leitura pública para o painel
DROP POLICY IF EXISTS "Qualquer pessoa com acesso ao post pode criar comentários" ON public.approval_comments;
DROP POLICY IF EXISTS "Comentário só em post existente" ON public.approval_comments;
CREATE POLICY "Comentário só em post existente"
  ON public.approval_comments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id));

DROP POLICY IF EXISTS "Ver comentários de aprovação" ON public.approval_comments;
CREATE POLICY "Ver comentários de aprovação"
  ON public.approval_comments FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.approval_comments (post_id);

-- 3. RPC segura do link público (fecha o vazamento antigo de posts)
DROP POLICY IF EXISTS "Acesso público via token de aprovação" ON public.posts;

CREATE OR REPLACE FUNCTION public.get_post_by_approval_token(p_token UUID)
RETURNS SETOF public.posts
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT * FROM public.posts WHERE approval_token = p_token LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_post_by_approval_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_by_approval_token(UUID) TO anon, authenticated;
