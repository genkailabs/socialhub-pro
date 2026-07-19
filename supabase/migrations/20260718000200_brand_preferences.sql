-- =====================================================================
-- BRAND_PREFERENCES — Composer adaptativo (formato/tom livres)
-- Rodar no SQL Editor do projeto Supabase ativo (schema diverge das migrations).
-- Migração ADITIVA e idempotente.
-- =====================================================================
--
-- O Composer trocou os cards fixos de formato por texto livre + sugestões.
-- Esta tabela guarda o histórico de formato/tom usados por marca, pra ordenar
-- as sugestões do FreeInput (mais usados primeiro). Puramente de conveniência
-- de UX — nunca bloqueia a geração de conteúdo se estiver indisponível.

CREATE TABLE IF NOT EXISTS public.brand_preferences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  preference_type  text NOT NULL,        -- 'format' | 'tone'
  value            text NOT NULL,
  usage_count      integer NOT NULL DEFAULT 1,
  last_used        timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, preference_type, value)
);

CREATE INDEX IF NOT EXISTS idx_brand_preferences_lookup
  ON public.brand_preferences (brand_id, preference_type, usage_count DESC, last_used DESC);

ALTER TABLE public.brand_preferences ENABLE ROW LEVEL SECURITY;

-- upsert simples NÃO incrementa (ON CONFLICT DO UPDATE só sobrescreve as
-- colunas enviadas). RPC garante usage_count = usage_count + 1 atomicamente.
CREATE OR REPLACE FUNCTION public.record_brand_preference(p_brand_id uuid, p_type text, p_value text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.brand_preferences (brand_id, preference_type, value, usage_count, last_used)
  VALUES (p_brand_id, p_type, p_value, 1, now())
  ON CONFLICT (brand_id, preference_type, value)
  DO UPDATE SET usage_count = public.brand_preferences.usage_count + 1, last_used = now();
END;
$$;
