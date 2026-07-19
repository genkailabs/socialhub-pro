-- Onboarding do Brand DNA (Wizard): objetivo principal da marca.
-- Único campo do fluxo que não tinha coluna; demais respostas cabem nas colunas TEXT/TEXT[] já existentes.
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS objective TEXT;
