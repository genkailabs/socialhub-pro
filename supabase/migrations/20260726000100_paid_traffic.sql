-- Paid traffic is read-only and remains separate from organic analytics.
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

-- Token is server-only: RLS is enabled without browser policies.
CREATE TABLE IF NOT EXISTS public.meta_ads_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT meta_ads_tokens_brand_key UNIQUE (brand_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_brand ON public.meta_ad_accounts (brand_id, is_active);
CREATE INDEX IF NOT EXISTS idx_meta_ads_snapshots_brand_range ON public.meta_ads_snapshots (brand_id, range_start, range_end);
CREATE INDEX IF NOT EXISTS idx_meta_ads_tokens_brand ON public.meta_ads_tokens (brand_id);

ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_tokens ENABLE ROW LEVEL SECURITY;

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
