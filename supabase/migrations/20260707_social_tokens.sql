-- =====================================================================
-- MIGRAÇÃO: ARMAZENAMENTO SEGURO DE TOKENS OAUTH & CACHE DE INSIGHTS
-- Rodar no SQL Editor do projeto Supabase: qmubkbszgjnaeeeyylgz
-- =====================================================================

-- 1. Tabela para armazenar tokens OAuth de forma segura
CREATE TABLE IF NOT EXISTS public.social_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                    -- 'instagram', 'facebook', etc.
  access_token TEXT NOT NULL,                -- Token de acesso real
  token_expires_at TIMESTAMPTZ,              -- Expiração do token
  platform_user_id TEXT,                     -- ID da conta na plataforma (ex: IG Business Account ID)
  platform_username TEXT,                    -- @handle na plataforma
  platform_data JSONB DEFAULT '{}'::jsonb,   -- Dados extras (page_id, page_name, foto de perfil, etc.)
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT social_tokens_brand_platform_key UNIQUE (brand_id, platform)
);

-- Habilitar RLS
ALTER TABLE public.social_tokens ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas o dono da marca pode ler/gravar seus tokens
DROP POLICY IF EXISTS "Usuários podem gerenciar tokens de suas marcas" ON public.social_tokens;
CREATE POLICY "Usuários podem gerenciar tokens de suas marcas" ON public.social_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = social_tokens.brand_id AND brands.user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_social_tokens_user_id ON public.social_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_brand_id ON public.social_tokens (brand_id);
CREATE INDEX IF NOT EXISTS idx_social_tokens_platform ON public.social_tokens (platform);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_social_tokens_updated_at ON public.social_tokens;
CREATE TRIGGER trg_social_tokens_updated_at BEFORE UPDATE ON public.social_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tabela para cache de insights e métricas da Graph API (evita rate limiting)
CREATE TABLE IF NOT EXISTS public.social_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,                 -- 'profile', 'reach', 'engagement', 'media'
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT social_insights_cache_brand_platform_metric_key UNIQUE (brand_id, platform, metric_type)
);

ALTER TABLE public.social_insights_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem gerenciar cache de suas marcas" ON public.social_insights_cache;
CREATE POLICY "Usuários podem gerenciar cache de suas marcas" ON public.social_insights_cache
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = social_insights_cache.brand_id AND brands.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_insights_cache_brand_platform ON public.social_insights_cache (brand_id, platform);
