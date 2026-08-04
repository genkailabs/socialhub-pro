-- =====================================================================
-- Tetos de uso de IA (ai_limits) — primeiros valores reais.
--
-- Contexto medido antes de escolher os números (generation_jobs, 30 dias
-- até 2026-08-03): $0,02 no total, 20 gerações, 15 sucesso / 5 erro. O
-- custo por geração fica entre $0,0002 e $0,003. O teto aqui não existe
-- para economizar centavos: existe para que um laço com defeito, um robô
-- ou um teste em produção não gaste sozinho o mês inteiro.
--
-- Todas as linhas são globais (brand_id NULL). Uma linha com brand_id
-- vence a global, que é como um plano diferenciado entra depois.
--
-- Períodos são cortados em UTC (lib/ai/limits.js:periodStart): o "dia"
-- vira às 21h de Brasília.
-- =====================================================================

INSERT INTO public.ai_limits (brand_id, skill_id, period, max_runs) VALUES
  -- Carrossel: o carro-chefe. 15 roteiros por dia é mais do que qualquer
  -- pessoa publica; quem bate isso está testando, não produzindo.
  (NULL, 'carousel-directions', 'day', 15),
  (NULL, 'carousel-full-brief', 'day', 15),
  -- Imagem custa por chamada e é a que mais se repete no ajuste fino.
  (NULL, 'carousel-image',      'day', 30),
  -- Produção avulsa de peça, mesmo teto do carrossel.
  (NULL, 'post-producer',       'day', 15),
  (NULL, 'story-planner',       'day', 15),
  (NULL, 'reel-producer',       'day', 15),
  -- Plano e estratégia são decisões de semana, não de minuto. Cinco por
  -- dia cobre errar, refazer e ainda comparar versões.
  (NULL, 'editorial-planner',   'day', 5),
  (NULL, 'content-strategy',    'day', 5),
  -- Pesquisa de tendência bate em API externa a cada chamada.
  (NULL, 'instagram-trends',    'day', 10)
ON CONFLICT DO NOTHING;

-- Sem linha de propósito (= sem limite):
--   content-review   — revisar o que já foi gerado é barato e é o passo que
--                      faz a pessoa publicar coisa melhor. Cobrar teto aqui
--                      empurraria para publicar sem revisar.
--   instagram-audit  — uma vez por marca na prática; refazer diagnóstico é
--                      raro e deliberado.
--   brand-context    — roda dentro de outros fluxos, que já têm o seu teto.

-- =====================================================================
-- ROLLBACK (manual):
--   DELETE FROM public.ai_limits WHERE brand_id IS NULL;
-- =====================================================================
