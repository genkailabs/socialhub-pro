-- =====================================================================
-- POSTS_MEDIA AND RETENTION POLICIES
-- Migração ADITIVA e idempotente
-- =====================================================================

-- 1. Criação da tabela posts_media
CREATE TABLE IF NOT EXISTS public.posts_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  user_id UUID,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  storage_bucket TEXT DEFAULT 'media',
  storage_path TEXT NOT NULL,
  media_type TEXT,
  mime_type TEXT,
  file_size INT,
  width INT,
  height INT,
  duration_seconds NUMERIC,
  position INT DEFAULT 0,
  upload_status TEXT DEFAULT 'uploaded',
  processing_status TEXT DEFAULT 'ready',
  temporary BOOLEAN DEFAULT true,
  delete_after TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deletion_attempts INT DEFAULT 0,
  last_deletion_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adição de colunas em posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS story_overlay_text TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS story_overlay_position JSONB;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS story_overlay_style JSONB;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS internal_reference_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS cover_storage_path TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS thumb_offset_ms INT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS share_to_feed BOOLEAN DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Índices na tabela posts
CREATE INDEX IF NOT EXISTS idx_posts_delete_after ON public.posts (delete_after);
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON public.posts (deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts (status);

-- 4. Índices na tabela posts_media
CREATE INDEX IF NOT EXISTS idx_posts_media_delete_after ON public.posts_media (delete_after);
CREATE INDEX IF NOT EXISTS idx_posts_media_deleted_at ON public.posts_media (deleted_at);
CREATE INDEX IF NOT EXISTS idx_posts_media_post_id ON public.posts_media (post_id);
CREATE INDEX IF NOT EXISTS idx_posts_media_brand_id ON public.posts_media (brand_id);

-- 5. Trigger de updated_at em posts_media
DROP TRIGGER IF EXISTS trg_posts_media_updated_at ON public.posts_media;
CREATE TRIGGER trg_posts_media_updated_at BEFORE UPDATE ON public.posts_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Habilitar RLS em posts_media
ALTER TABLE public.posts_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem gerenciar mídias de suas marcas" ON public.posts_media;
CREATE POLICY "Usuários podem gerenciar mídias de suas marcas"
  ON public.posts_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = posts_media.brand_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = posts_media.brand_id AND b.user_id = auth.uid()
    )
  );
