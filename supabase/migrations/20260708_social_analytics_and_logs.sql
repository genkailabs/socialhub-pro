-- =====================================================================
-- MIGRAÇÃO: HISTÓRICO ANALÍTICO E LOGS DE SINCRONIZAÇÃO DAS REDES SOCIAIS
-- Rodar no SQL Editor do projeto Supabase: geoqbbrlyepmhwgdbjmz
-- =====================================================================

-- 1. Tabela para armazenar o histórico analítico diário das redes sociais
CREATE TABLE IF NOT EXISTS public.social_analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                         -- 'instagram', 'youtube', etc.
  snapshot_date DATE NOT NULL,                   -- Data da foto (YYYY-MM-DD)
  followers INTEGER DEFAULT 0,                   -- Total de seguidores no dia
  engagement_rate TEXT DEFAULT '0.0%',           -- Taxa de engajamento formatada (ex: '4.2%')
  total_reach INTEGER DEFAULT 0,                 -- Alcance total (visualizações, alcance, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT social_analytics_history_brand_platform_date_key UNIQUE (brand_id, platform, snapshot_date)
);

-- Habilitar RLS
ALTER TABLE public.social_analytics_history ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas o dono da marca pode gerenciar o histórico de métricas
DROP POLICY IF EXISTS "Usuários podem gerenciar histórico analítico de suas marcas" ON public.social_analytics_history;
CREATE POLICY "Usuários podem gerenciar histórico analítico de suas marcas" ON public.social_analytics_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = social_analytics_history.brand_id AND brands.user_id = auth.uid()
    )
  );

-- Índices para otimização de buscas históricas
CREATE INDEX IF NOT EXISTS idx_analytics_history_brand_platform ON public.social_analytics_history (brand_id, platform);
CREATE INDEX IF NOT EXISTS idx_analytics_history_snapshot_date ON public.social_analytics_history (snapshot_date DESC);


-- 2. Tabela para registrar logs de sincronização de APIs oficiais das redes sociais
CREATE TABLE IF NOT EXISTS public.social_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                         -- 'instagram', 'youtube', etc.
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,                            -- Mensagem de erro caso falhe
  duration_ms INTEGER,                           -- Tempo de resposta da chamada à API oficial
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.social_sync_logs ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas o dono da marca pode ler os logs de sincronização
DROP POLICY IF EXISTS "Usuários podem gerenciar logs de sincronização de suas marcas" ON public.social_sync_logs;
CREATE POLICY "Usuários podem gerenciar logs de sincronização de suas marcas" ON public.social_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = social_sync_logs.brand_id AND brands.user_id = auth.uid()
    )
  );

-- Índices para ordenação e filtragem dos logs de sincronização
CREATE INDEX IF NOT EXISTS idx_sync_logs_brand_platform ON public.social_sync_logs (brand_id, platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON public.social_sync_logs (synced_at DESC);
