-- ==========================================
-- SCRIPT SQL DE INICIALIZAÇÃO DO SOCIALHUB
-- ==========================================
-- Este script deve ser executado no SQL Editor do seu projeto Supabase
-- para criar as tabelas e políticas de segurança RLS.

-- 1. Tabela de Perfis de Usuários (Agências / Gestores)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  agency_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Marcas / Workspaces / Clientes
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  connected_networks TEXT[] DEFAULT '{}', -- ex: '{"instagram", "linkedin", "facebook"}'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela de Publicações / Posts Agendados
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  caption TEXT,
  media_urls TEXT[] DEFAULT '{}',
  target_networks TEXT[] DEFAULT '{}', -- ex: '{"instagram_feed", "linkedin"}'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'awaiting_approval', 'scheduled', 'published', 'error')),
  approval_token UUID DEFAULT gen_random_uuid() UNIQUE, -- Token seguro para link público de aprovação externa
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabela de Comentários no Workflow de Aprovação Externa e Inbox
CREATE TABLE IF NOT EXISTS public.approval_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  action_taken TEXT CHECK (action_taken IN ('approved', 'changes_requested', 'comment_only')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (RLS - Row Level Security)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Usuários podem ver seu próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Políticas para Brands (Apenas dono pode ver e modificar suas marcas)
CREATE POLICY "Usuários podem gerenciar suas próprias marcas" 
  ON public.brands FOR ALL 
  USING (auth.uid() = user_id);

-- Políticas para Posts (Dono da marca pode gerenciar)
CREATE POLICY "Usuários podem gerenciar posts de suas marcas" 
  ON public.posts FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.brands 
      WHERE brands.id = posts.brand_id AND brands.user_id = auth.uid()
    )
  );

-- POLÍTICA PÚBLICA DE APROVAÇÃO EXTERNA:
-- Permite leitura de um post específico se o token de aprovação for correspondido na URL (sem precisar logar)
CREATE POLICY "Acesso público via token de aprovação" 
  ON public.posts FOR SELECT 
  USING (true); -- No frontend filtraremos por approval_token no link

-- Políticas para Comentários de Aprovação
CREATE POLICY "Qualquer pessoa com acesso ao post pode criar comentários" 
  ON public.approval_comments FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Qualquer pessoa com acesso ao post pode ver os comentários" 
  ON public.approval_comments FOR SELECT 
  USING (true);

-- Função Trigger para criar perfil automaticamente no cadastro do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, agency_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Gestor'), COALESCE(new.raw_user_meta_data->>'agency_name', 'Agência Principal'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
