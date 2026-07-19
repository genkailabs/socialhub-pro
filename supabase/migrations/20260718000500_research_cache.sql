-- =====================================================================
-- CACHE DE PESQUISA — Motor de Conteúdo e Pesquisa (Gemini Grounding)
-- Rodar no SQL Editor do projeto Supabase ativo (schema diverge das migrations).
-- Migração ADITIVA e idempotente.
-- =====================================================================
--
-- Guarda o resultado de cada pesquisa (Gemini com Google Search Grounding) por
-- uma janela curta (6h, aplicada no código). Corta chamadas duplicadas quando o
-- cron do Autopilot gera vários posts do mesmo tema, ou quando várias marcas do
-- mesmo nicho pedem o mesmo contexto. Só sucesso (summary não-vazio) é gravado.
--
-- As `sources` ficam AQUI (auditoria) e nunca vão para a UI.

CREATE TABLE IF NOT EXISTS public.research_cache (
  query_hash text PRIMARY KEY,
  query      text NOT NULL,
  summary    text NOT NULL,
  sources    jsonb NOT NULL DEFAULT '[]'::jsonb,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- O código filtra por created_at (janela de 6h). Índice evita scan a cada busca.
CREATE INDEX IF NOT EXISTS idx_research_cache_created_at
  ON public.research_cache (created_at);

-- Sem acesso do client: só o servidor (service role / server actions) lê e grava.
-- RLS ligado sem policy = nega tudo para anon/authenticated; service role ignora RLS.
ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;
