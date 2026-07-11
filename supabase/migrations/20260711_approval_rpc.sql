-- RPC segura para o link público de aprovação (projeto geoqbbrlyepmhwgdbjmz).
-- A 20260707 criou esta função, mas foi escrita para o projeto antigo; reaplicar aqui.
-- Idempotente.

-- Fecha o vazamento antigo (anon lia todos os posts), se ainda existir.
DROP POLICY IF EXISTS "Acesso público via token de aprovação" ON public.posts;

CREATE OR REPLACE FUNCTION public.get_post_by_approval_token(p_token UUID)
RETURNS SETOF public.posts
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.posts WHERE approval_token = p_token LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_post_by_approval_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_by_approval_token(UUID) TO anon, authenticated;

-- Garante que o comentário externo só entre em post existente (fluxo de aprovação).
DROP POLICY IF EXISTS "Qualquer pessoa com acesso ao post pode criar comentários" ON public.approval_comments;
DROP POLICY IF EXISTS "Comentário só em post existente" ON public.approval_comments;
CREATE POLICY "Comentário só em post existente"
  ON public.approval_comments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id));
