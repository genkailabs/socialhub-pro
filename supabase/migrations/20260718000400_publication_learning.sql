-- PRD 7: une recomendação, publicação, aprovação e aprendizado posterior.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS recommendation_id UUID REFERENCES public.marketing_recommendations(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publication_attempted_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS publication_attempt JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_posts_recommendation_id ON public.posts (recommendation_id);

CREATE TABLE IF NOT EXISTS public.publication_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.marketing_recommendations(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  hypothesis TEXT NOT NULL,
  metric_name TEXT,
  baseline_value NUMERIC,
  observed_value NUMERIC,
  comparison_percent NUMERIC,
  topic TEXT,
  format TEXT,
  pillar TEXT,
  result_status TEXT NOT NULL DEFAULT 'pending' CHECK (result_status IN ('pending', 'measured', 'inconclusive')),
  user_feedback TEXT,
  measured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publication_learning_brand_measured ON public.publication_learning (brand_id, measured_at DESC);

ALTER TABLE public.publication_learning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "publication_learning_owner_all" ON public.publication_learning;
CREATE POLICY "publication_learning_owner_all" ON public.publication_learning FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = publication_learning.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = publication_learning.brand_id AND b.user_id = auth.uid()));
