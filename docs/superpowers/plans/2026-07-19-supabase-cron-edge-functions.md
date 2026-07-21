# Supabase Cron e Edge Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transferir a publicação de posts vencidos e a sincronização do YouTube do Railway/Next.js para Supabase Cron e Edge Functions.

**Architecture:** Uma migração Postgres adiciona rastreabilidade de publicação, cria funções RPC seguras para reivindicar posts e agenda Edge Functions via `pg_cron` + `pg_net`. As Edge Functions usam apenas secrets do Supabase e chamam APIs externas diretamente; o Next.js continua apenas agendando e exibindo dados.

**Tech Stack:** Supabase Postgres, pg_cron, pg_net, Deno Edge Functions, Supabase JS, Vitest, Next.js.

## Global Constraints

- O cron de publicação executa a cada cinco minutos (`*/5 * * * *`) e a frequência fica concentrada em uma constante SQL.
- Nenhuma Edge Function depende de URL, segredo ou rota do Next.js.
- A reivindicação deve ser atômica e impedir publicação duplicada.
- Falhas registram tentativa, erro e logs; após três tentativas o post vira `failed`.
- Secrets ficam apenas no ambiente de Edge Functions.
- Não disparar publicações reais durante testes locais.

---

### Task 1: Persistência, estados e agendamento no banco

**Files:**
- Create: `supabase/migrations/20260719_supabase_cron_publication.sql`
- Modify: `supabase/migrations/20260717_publish_idempotency.sql` only if compatibility requires it
- Test: `tests/unit/publication-scheduler.test.js`

- [ ] Adicionar `published_at`, `publishing_started_at`, `publish_attempts`, `last_publish_error` e `external_post_id` de forma aditiva.
- [ ] Atualizar a constraint de status preservando estados existentes e aceitando `publishing`, `failed` e `cancelled`.
- [ ] Criar `publication_job_logs` com duração, resultados e erro.
- [ ] Criar RPC `claim_due_posts(batch_size, max_attempts)` usando `FOR UPDATE SKIP LOCKED`; ela atualiza `scheduled` para `publishing` e incrementa tentativas na mesma transação.
- [ ] Criar RPC de recuperação de itens presos e agendar `publish-due-posts` com `pg_cron`/`pg_net` a cada cinco minutos; a URL da Edge Function e o header Authorization vêm de Vault/settings do banco.

### Task 2: Edge Function de publicação

**Files:**
- Create: `supabase/functions/publish-due-posts/index.ts`
- Create: `supabase/functions/publish-due-posts/deno.json`
- Test: `tests/unit/edge-publication-contract.test.js`

- [ ] Implementar handler autenticado apenas pelo service-role do cron.
- [ ] Buscar posts através da RPC, carregar tokens ativos, publicar Instagram/Facebook via Graph API e atualizar cada item para `published` ou `scheduled`/`failed`.
- [ ] Registrar início, fim, duração, resposta sanitizada e erro em `publication_job_logs`.
- [ ] Usar três tentativas máximas persistidas e nunca repetir post já reivindicado por outro worker.

### Task 3: Edge Function do YouTube e remoção do Railway

**Files:**
- Create: `supabase/functions/youtube-sync/index.ts`
- Modify: `package.json`
- Delete: `lib/railway-cron.cjs`
- Delete: `tests/unit/railway-cron.test.js`
- Modify: `.env.example`

- [ ] Migrar a sincronização de métricas para Deno, lendo credenciais do ambiente Supabase.
- [ ] Adicionar segundo schedule SQL diário para `youtube-sync`.
- [ ] Remover scripts e referências exclusivas ao Railway; manter rotas Next existentes apenas como endpoints manuais autenticados até a próxima remoção planejada.

### Task 4: Dashboard, testes e documentação operacional

**Files:**
- Modify: `lib/posts-data.js`
- Modify: `app/(app)/dashboard/page.jsx` and/or existing status UI consumers
- Create: `docs/SUPABASE_CRON_SETUP.md`
- Modify: affected unit tests

- [ ] Expor e mostrar status, horário publicado e último erro sem expor tokens.
- [ ] Cobrir transições e semântica de retry em testes puros.
- [ ] Documentar `supabase functions deploy`, secrets necessários e como aplicar a migração; não executar deploy remoto nem a migração automaticamente.
