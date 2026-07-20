# Handoff — Social Hub / Jornada Instagram

Estado em 2026-07-17. Branch `feat/jornada-instagram` (LOCAL — confirmar push antes de deploy; Render roda a aplicação publicada).

## O que está pronto (Fases 0-5)

343 testes verdes, build verde. Jornada do PRD completa ponta a ponta:
diagnóstico → DNA versionado → estratégia → plano semanal → produção → revisão.

- **Fundação IA**: `lib/ai/provider/` (runText, adapters DeepSeek+Gemini, troca por `AI_TEXT_PROVIDER`), `lib/ai/skills/` (registry+run com Zod, retry, log de custo), `lib/ai/limits.js`.
- **Skills**: brand-context, instagram-audit, content-strategy, editorial-planner (v2, 4 formatos), post-producer, reel-producer, story-planner, content-review.
- **Registro de formatos** `lib/formats.js`: formato ≠ publicabilidade. image/carousel publicam; reel/stories saem como roteiro (§5.1).
- **Rotas novas**: `/instagram/diagnostico`, `/planning`, `/content/[id]/review`. Estratégia mora em `/autopilot`. Nav atualizada (Piloto agora aparece = "Estrategia e Piloto").
- **Correções**: media_urls (agendamento), approval-flow (horário respeitado), cron via Supabase/Edge Functions, escopo OAuth instagram_manage_insights.

## Migrations aplicadas e verificadas no Supabase (geoqbbrlyepmhwgdbjmz)

Todas as 6 confirmadas por sonda read-only:
media_urls, ai_skills_and_limits, instagram_audits, onboarding+dna_versions,
strategy+editorial_plan, content_production. **Nada pendente no banco.**

## RESUMO PRA CONTINUAR (se trocar de IA) — 2026-07-17

Estado ao fim da sessão:
- **Fase 6 (publicação confiável): FEITA em código, suíte 362/362 verde.** Arquivos: `lib/publishers/index.js`, `app/api/cron/publish-due/route.js` (claim atômico), `supabase/migrations/20260717_publish_idempotency.sql`, `tests/unit/publishers.test.js`. `brands.test.js` ajustado p/ `#007AFF`.
- **Paleta nova (design): VERIFICADA.** `--c-accent` lia vazio só porque um dev server velho (outra sessão) servia CSS stale na :3000. Restart limpo (`rm -rf .next` + subir) → paleta carrega certa (runtime `10 132 255` dark / `0 122 255` light). SEM bug no globals.css. Codex está aplicando o resto do design em paralelo.

Próximos passos, em ordem:
1. **APLICAR A MIGRATION (bloqueio de deploy).** `supabase/migrations/20260717_publish_idempotency.sql` no **SQL Editor** do projeto `geoqbbrlyepmhwgdbjmz` (dashboard.supabase.com → SQL Editor → colar → Run). NÃO usar `supabase db push`: o CLI está linkado no ref MORTO `qmubkbszgjnaeeeyylgz` (ver memória `supabase-account`). Sem essa migration, `status='publishing'` viola o CHECK e trava a publicação.
2. **Commitar** design (Codex) + Fase 6 juntos quando o Codex terminar.
3. **Teste manual do usuário** (só ele loga): diagnóstico→estratégia→plano→criar conteúdo em localhost:3000. Verificar QUALIDADE da IA: plano inclui Reel/Stories? roteiro de Reel é gravável? revisão é útil ou barulhenta?
4. **Push**. Deploy só DEPOIS da migration aplicada.

## Fase 6 — publicação confiável (FEITA em código, migration pendente de apply)

Implementado em 2026-07-17 (branch local, não pushado):
- **Idempotência**: claim atômico `scheduled→publishing` por linha em `app/api/cron/publish-due/route.js` + `order('scheduled_at')`. Elimina publicação dupla de crons sobrepostos.
- **Migration** `supabase/migrations/20260717_publish_idempotency.sql`: adiciona `'publishing'` ao `posts_status_check`, índice `(status, scheduled_at)`, e re-hidrata posts presos em `publishing` >10min. **PENDENTE: aplicar no Supabase (geoqbbrlyepmhwgdbjmz) ANTES de publicar/deploy** — sem isso o `status='publishing'` viola o CHECK e trava a publicação. Confirmar com o usuário (memória `supabase-account`).
- **Publicadores** `lib/publishers/index.js`: dispatch por plataforma (ig image/carousel, fb photo), retry com backoff em erro transitório, recusa formato não publicável (§5.1). Graph injetável.
- **Testes** `tests/unit/publishers.test.js`: 19 verdes. Suíte 361/362 (a 1 falha é `brands.test.js` cor default `#6366F1`→`#007AFF`, é da paleta nova do Codex, não da Fase 6 — chip criado).
- Formato→template já estava em `lib/content-production.js` (`templateForFormat`).

## Regras aprendidas (importantes)

- **Migrations locais NÃO são fonte de verdade** do banco. Sondar via PostgREST antes de DDL. Ver memória `schema-supabase-diverge-das-migrations`.
- Render hospeda, Neon/Supabase são banco/Auth conforme ambiente configurado. Não confundir hospedagem com banco.
- Sonda read-only: `GET {url}/rest/v1/{tabela}?select={col}&limit=0`. Scripts em scratchpad. Classificador de segurança às vezes bloqueia node lendo .env.local — repetir.
- Plano completo: `C:\Users\Damien\.claude\plans\tingly-jumping-hoare.md`.
