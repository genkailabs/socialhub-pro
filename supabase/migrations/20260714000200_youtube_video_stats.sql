-- =====================================================================
-- MIGRAÇÃO: MÉTRICAS POR VÍDEO DO YOUTUBE
-- Rodar no SQL Editor do projeto Supabase (mesmo padrão das outras migrações).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.youtube_video_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text,
  published_at timestamptz,
  snapshot_date date NOT NULL,
  views int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  avg_view_pct numeric DEFAULT 0,
  watch_time_min int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT youtube_video_stats_brand_video_date_key UNIQUE (brand_id, video_id, snapshot_date)
);

ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono da marca gerencia stats de vídeo" ON public.youtube_video_stats;
CREATE POLICY "Dono da marca gerencia stats de vídeo" ON public.youtube_video_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = youtube_video_stats.brand_id AND brands.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_yt_video_stats_brand ON public.youtube_video_stats (brand_id, video_id);
CREATE INDEX IF NOT EXISTS idx_yt_video_stats_date ON public.youtube_video_stats (snapshot_date DESC);
