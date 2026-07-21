-- Migration: 20260721204500_update_onboarding_status_check.sql
-- Description: Update onboarding_status CHECK constraint on brand_kits to accept not_started, pending, in_progress, completed.

ALTER TABLE public.brand_kits DROP CONSTRAINT IF EXISTS brand_kits_onboarding_status_check;

ALTER TABLE public.brand_kits ADD CONSTRAINT brand_kits_onboarding_status_check CHECK (onboarding_status IN ('not_started', 'pending', 'in_progress', 'completed'));
