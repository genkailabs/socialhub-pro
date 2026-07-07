-- =====================================================================
-- CORREÇÃO DE SCHEMA + RLS  (SocialHub / HubSocialMedia)
-- Rodar no SQL Editor do projeto Supabase: qmubkbszgjnaeeeyylgz
-- CONFIRME o email da conta antes de executar.
-- Migração ADITIVA e idempotente (pode rodar mais de uma vez sem apagar dados).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BRANDS: colunas que o código usa mas não existiam (persistência quebrada)
-- ---------------------------------------------------------------------
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS handle            TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS category          TEXT DEFAULT 'Geral';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS color             TEXT DEFAULT '#F26526';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS followers         TEXT DEFAULT '0';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS engagement        TEXT DEFAULT '0%';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS networks_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- ---------------------------------------------------------------------
-- 2. POSTS: colunas que o código usa (content/media_url/networks/scheduled_at/metrics)
-- ---------------------------------------------------------------------
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content      TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_url    TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS networks     TEXT[] DEFAULT '{}';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes        INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments     INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS shares       INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- CHECK de status alinhado aos valores que o app realmente usa
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'waiting_approval', 'scheduled', 'published', 'error'));

-- ---------------------------------------------------------------------
-- 3. ÍNDICES (FKs e busca por token — evita full scan)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_brands_user_id       ON public.brands (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_brand_id       ON public.posts (brand_id);
CREATE INDEX IF NOT EXISTS idx_posts_approval_token ON public.posts (approval_token);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at   ON public.posts (scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id     ON public.approval_comments (post_id);

-- ---------------------------------------------------------------------
-- 4. updated_at automático
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. RLS: FECHAR o vazamento entre clientes (tenant isolation)
--    Antes: "posts SELECT USING (true)" -> QUALQUER anon lia posts de TODOS.
--    Agora: dono vê os seus; aprovação pública passa por RPC com token.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Acesso público via token de aprovação" ON public.posts;

-- (mantém) dono da marca gerencia seus posts — já existe: "Usuários podem gerenciar posts de suas marcas"

-- RPC segura para o link público de aprovação: só retorna 1 post SE o token bater.
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

-- ---------------------------------------------------------------------
-- 6. approval_comments: comentário externo só em post que EXISTE.
--    (fluxo de aprovação é público por design, mas amarrado ao post via token/link)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Qualquer pessoa com acesso ao post pode criar comentários" ON public.approval_comments;
CREATE POLICY "Comentário só em post existente"
  ON public.approval_comments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id));

-- SELECT de comentários permanece público para o painel de aprovação externa.
-- Se quiser fechar totalmente, troque por RPC igual ao get_post_by_approval_token.

-- =====================================================================
-- FIM. Após rodar: teste criar marca + conectar canal logado -> deve persistir.
-- =====================================================================
