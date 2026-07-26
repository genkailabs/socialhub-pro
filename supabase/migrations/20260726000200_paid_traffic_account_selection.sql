ALTER TABLE public.meta_ads_tokens
  ADD COLUMN IF NOT EXISTS account_options JSONB,
  ADD COLUMN IF NOT EXISTS selected_meta_account_id TEXT;
