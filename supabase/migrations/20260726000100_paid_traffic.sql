-- Dados de trafego pago ficam separados da analitica organica.
CREATE TABLE IF NOT EXISTS public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  meta_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  account_status TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meta_ad_accounts_brand_account_key UNIQUE (brand_id, meta_account_id)
);

CREATE TABLE IF NOT EXISTS public.meta_ads_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('campaign', 'adset', 'ad')),
  meta_object_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  range_start DATE NOT NULL,
  range_end DATE NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meta_ads_snapshots_unique UNIQUE (ad_account_id, level, meta_object_id, snapshot_date, range_start, range_end)
);

CREATE TABLE IF NOT EXISTS public.meta_ads_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  ad_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('create_campaign', 'pause_campaign', 'resume_campaign')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('draft', 'approved', 'sent', 'succeeded', 'failed', 'rejected')) DEFAULT 'draft',
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_brand ON public.meta_ad_accounts (brand_id, is_active);
CREATE INDEX IF NOT EXISTS idx_meta_ads_snapshots_brand_range ON public.meta_ads_snapshots (brand_id, range_start, range_end);
CREATE INDEX IF NOT EXISTS idx_meta_ads_operations_brand_created ON public.meta_ads_operations (brand_id, created_at DESC);

ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ad_accounts_owner" ON public.meta_ad_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brands WHERE brands.id = meta_ad_accounts.brand_id AND brands.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.brands WHERE brands.id = meta_ad_accounts.brand_id AND brands.user_id = auth.uid())
);
CREATE POLICY "meta_ads_snapshots_owner" ON public.meta_ads_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brands WHERE brands.id = meta_ads_snapshots.brand_id AND brands.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.brands WHERE brands.id = meta_ads_snapshots.brand_id AND brands.user_id = auth.uid())
);
CREATE POLICY "meta_ads_operations_owner" ON public.meta_ads_operations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brands WHERE brands.id = meta_ads_operations.brand_id AND brands.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.brands WHERE brands.id = meta_ads_operations.brand_id AND brands.user_id = auth.uid())
);
