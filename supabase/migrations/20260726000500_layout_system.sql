-- Sistema de estruturas, componentes e estilos do Composer (PRD §8).
--
-- O catálogo interno vive em código (lib/layouts/*) porque a montagem da peça é
-- pura e precisa rodar no navegador sem ida ao banco. Estas tabelas guardam o
-- mesmo catálogo para curadoria (ativar/desativar, miniatura) e, principalmente,
-- os layouts salvos pela marca (§11) e o histórico que evita repetição (§13).

CREATE TABLE IF NOT EXISTS public.layout_structures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'todos',
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,
  slides INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  thumbnail_url TEXT,
  structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.layout_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  behavior TEXT NOT NULL CHECK (behavior IN ('dynamic', 'fixed')),
  text_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_position JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.visual_styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  spacing JSONB NOT NULL DEFAULT '{}'::jsonb,
  contrast TEXT NOT NULL DEFAULT 'alto',
  image_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  effects JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- §11: combinação validada de estrutura, componentes e estilo, salva pela marca.
CREATE TABLE IF NOT EXISTS public.layout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'post',
  ratio TEXT NOT NULL DEFAULT '1:1',
  category TEXT,
  structure_id TEXT REFERENCES public.layout_structures(id) ON DELETE SET NULL,
  style_id TEXT REFERENCES public.visual_styles(id) ON DELETE SET NULL,
  template JSONB NOT NULL,
  usage_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- §13: sem histórico a antirrepetição só valeria dentro de uma sessão, e a marca
-- receberia a mesma estrutura toda vez que recarregasse o Composer.
CREATE TABLE IF NOT EXISTS public.layout_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  structure_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  template_id UUID REFERENCES public.layout_templates(id) ON DELETE SET NULL,
  format TEXT NOT NULL DEFAULT 'post',
  content_type TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS layout_templates_brand_idx ON public.layout_templates(brand_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS layout_usage_brand_idx ON public.layout_usage(brand_id, used_at DESC);

ALTER TABLE public.layout_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_usage ENABLE ROW LEVEL SECURITY;

-- O catálogo é do produto: qualquer usuário autenticado lê, ninguém escreve pelo
-- navegador. Curadoria e seed passam pela service_role.
DROP POLICY IF EXISTS "Catalogo de estruturas e publico para leitura" ON public.layout_structures;
CREATE POLICY "Catalogo de estruturas e publico para leitura" ON public.layout_structures
  FOR SELECT TO authenticated USING (status = 'ativo');
DROP POLICY IF EXISTS "Catalogo de componentes e publico para leitura" ON public.layout_components;
CREATE POLICY "Catalogo de componentes e publico para leitura" ON public.layout_components
  FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Catalogo de estilos e publico para leitura" ON public.visual_styles;
CREATE POLICY "Catalogo de estilos e publico para leitura" ON public.visual_styles
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Dono le layouts da marca" ON public.layout_templates;
CREATE POLICY "Dono le layouts da marca" ON public.layout_templates
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = layout_templates.brand_id AND b.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Dono cria layouts da marca" ON public.layout_templates;
CREATE POLICY "Dono cria layouts da marca" ON public.layout_templates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = layout_templates.brand_id AND b.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Dono edita layouts da marca" ON public.layout_templates;
CREATE POLICY "Dono edita layouts da marca" ON public.layout_templates
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = layout_templates.brand_id AND b.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Dono apaga layouts da marca" ON public.layout_templates;
CREATE POLICY "Dono apaga layouts da marca" ON public.layout_templates
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = layout_templates.brand_id AND b.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Dono le uso de layout da marca" ON public.layout_usage;
CREATE POLICY "Dono le uso de layout da marca" ON public.layout_usage
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = layout_usage.brand_id AND b.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Dono registra uso de layout da marca" ON public.layout_usage;
CREATE POLICY "Dono registra uso de layout da marca" ON public.layout_usage
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = layout_usage.brand_id AND b.user_id = auth.uid())
  );

GRANT SELECT ON public.layout_structures, public.layout_components, public.visual_styles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.layout_templates TO authenticated;
GRANT SELECT, INSERT ON public.layout_usage TO authenticated;
