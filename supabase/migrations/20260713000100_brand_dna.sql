-- Brand DNA AI: estende brand_kits + sinais de aprendizado
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS personality      TEXT[] DEFAULT '{}';
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS emotions         TEXT[] DEFAULT '{}';
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS formality        TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS emoji_usage      TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS cta_policy       TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS storytelling     BOOLEAN;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS visual_style     TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS caption_length   TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS dna_report       JSONB;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS dna_sources      JSONB;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS dna_generated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.dna_signals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  post_id    UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  action     TEXT NOT NULL CHECK (action IN ('approve','reject','edit')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dna_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dna_signals_brand ON public.dna_signals (brand_id, created_at DESC);
DROP POLICY IF EXISTS "dna_signals_owner_all" ON public.dna_signals;
CREATE POLICY "dna_signals_owner_all" ON public.dna_signals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = dna_signals.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = dna_signals.brand_id AND b.user_id = auth.uid()));
