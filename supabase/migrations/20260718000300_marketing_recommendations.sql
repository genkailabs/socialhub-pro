-- Recomendação prioritária do Assistente de Marketing (PRD 2).
CREATE TABLE IF NOT EXISTS public.marketing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('instagram', 'youtube', 'general')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'accepted', 'content_created', 'scheduled', 'published', 'dismissed')),
  title TEXT NOT NULL,
  finding TEXT NOT NULL,
  meaning TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  content_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  source_type TEXT NOT NULL CHECK (source_type IN ('performance_drop', 'performance_opportunity', 'content_gap', 'consistency', 'brand_strategy', 'current_event', 'evergreen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Não há lista de ideias: cada marca pode ter somente uma recomendação pronta.
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_recommendations_one_ready
  ON public.marketing_recommendations (brand_id) WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_marketing_recommendations_brand_created
  ON public.marketing_recommendations (brand_id, created_at DESC);

ALTER TABLE public.marketing_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "marketing_recommendations_owner_all" ON public.marketing_recommendations;
CREATE POLICY "marketing_recommendations_owner_all" ON public.marketing_recommendations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = marketing_recommendations.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = marketing_recommendations.brand_id AND b.user_id = auth.uid()));
