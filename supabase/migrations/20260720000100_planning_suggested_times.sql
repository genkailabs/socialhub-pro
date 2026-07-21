-- Horario sugerido no planejamento editorial.
-- O horario fica separado da data porque a aprovacao/producao ainda tem etapas
-- proprias; quando virar post, o app combina date + suggested_time em Sao Paulo.

ALTER TABLE public.editorial_plan_items
  ADD COLUMN IF NOT EXISTS suggested_time TEXT;

ALTER TABLE public.editorial_plan_item_versions
  ADD COLUMN IF NOT EXISTS suggested_time TEXT;
