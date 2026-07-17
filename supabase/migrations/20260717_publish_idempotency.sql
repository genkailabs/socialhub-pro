-- =====================================================================
-- PUBLICACAO CONFIAVEL (PRD Fase 6) — idempotencia no cron de publicacao
-- Rodar no SQL Editor do projeto Supabase ativo.
-- Migracao ADITIVA e idempotente.
-- =====================================================================
--
-- Problema: /api/cron/publish-due seleciona posts 'scheduled' e publica sem
-- reservar a linha. Dois disparos sobrepostos do cron (execucao lenta > 5min,
-- ou disparo manual concorrente) leem os MESMOS posts e publicam duas vezes no
-- Instagram. O perfil do cliente recebe o post em dobro.
--
-- Correcao: estado transitorio 'publishing'. O worker reivindica a linha com um
-- UPDATE condicional (scheduled -> publishing) que so um vencedor consegue;
-- quem perder a corrida ve zero linhas afetadas e ignora o post. So depois de
-- reivindicar e que publica. Postgres garante a atomicidade do UPDATE ... WHERE.

-- ---------------------------------------------------------------------
-- 1. Novo estado no CHECK de status
--    Precisa listar TODOS os valores: o CHECK e substituido, nao somado.
--    Mantidos os estados de 20260717_content_production.sql + 'publishing'.
-- ---------------------------------------------------------------------
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check
  CHECK (status IN (
    'draft',
    'waiting_approval',
    'scheduled',
    'publishing',       -- reivindicado pelo cron; em publicacao (transitorio)
    'published',
    'error',
    'ready_to_post',    -- roteiro/sequencia entregue; o usuario posta
    'posted_manually'   -- o usuario confirmou que postou
  ));

-- ---------------------------------------------------------------------
-- 2. Indice da fila
--    O cron filtra status='scheduled' ordenado por scheduled_at. Sem indice
--    composto isso e um scan a cada 5 min.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled_at
  ON public.posts (status, scheduled_at);

-- ---------------------------------------------------------------------
-- 3. Rede de seguranca: reidrata posts presos em 'publishing'
--    Se o worker morrer entre reivindicar e finalizar, a linha fica 'publishing'
--    para sempre. Devolve para a fila o que passou do prazo (10 min) sem virar
--    published/error. Idempotente: rodar de novo nao muda nada ja resolvido.
-- ---------------------------------------------------------------------
UPDATE public.posts
   SET status = 'scheduled'
 WHERE status = 'publishing'
   AND scheduled_at < now() - interval '10 minutes';
