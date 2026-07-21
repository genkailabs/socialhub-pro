---
title: Testes e Deploy
description: Vitest/Playwright, deploy na Vercel e limitações do cron de agendamento.
tags:
  - wiki
  - testing
  - deploy
  - vercel
---
# Testes e Deploy

Stack de testes/deploy: ver [Arquitetura e stack](./architecture.md).

## Testes

- **Unitários (Vitest)** em `tests/unit/`: `utils.test.js`, `brands.test.js`, `platforms.test.js`, `metrics.test.js`, `calendar.test.js`, `posts-media.test.js`, `dna.test.js`, `color.test.js`, `ai.test.js`. Cobrem principalmente helpers puros (`lib/*.js` sem I/O) — validação de marca, cálculo de engajamento, grid de calendário, regras de mídia de post, normalização de Brand DNA, extração de cor, custo/spec de IA.
- **E2E (Playwright)** em `tests/e2e/`: `auth.spec.js`, `shell.spec.js`.
- Comandos: `npm run test` (Vitest run), `npm run test:watch`, `npm run e2e` (Playwright, config em `playwright.config.js`).

## Deploy (Vercel)

1. Repositório importado na Vercel (framework Next.js detectado via `vercel.json`).
2. Env vars configuradas em Project Settings: `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` (cliente), `SUPABASE_SERVICE_ROLE_KEY` (servidor, só cron), `META_APP_ID`/`META_APP_SECRET`/`META_OAUTH_SCOPES` (servidor), `APP_URL`, `CRON_SECRET`.
3. No Supabase Auth, adicionar a URL de produção em **Redirect URLs** e `/auth/callback` (e, em dev, `http://localhost:3000/**` / `:3001/**`, senão o OAuth Google cai na Site URL de produção).
4. Headers de segurança definidos em `next.config.js`.

## Limitação do cron (Vercel Hobby)

O agendamento é executado por Supabase Cron a cada cinco minutos, que chama a Edge Function `publish-due-posts` diretamente. Consulte `docs/SUPABASE_CRON_SETUP.md` para configurar Vault, secrets e deploy das funções.

## Variáveis de ambiente (`.env.local`)

| Chave | Onde | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente | Chave anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | Service role, só no cron |
| `META_APP_ID` / `META_APP_SECRET` | servidor | App Meta p/ OAuth do Instagram |
| `META_OAUTH_SCOPES` | servidor | Escopos do OAuth Meta |
| `APP_URL` | servidor | URL pública (callbacks) |
| `CRON_SECRET` | servidor | Protege o endpoint de cron |
| `DEEPSEEK_API_KEY` | servidor | Provider de texto da IA |
| `DEAPI_API_KEY` | servidor | Provider de imagem da IA (opcional — sem ela, cai no render on-brand zero-custo) |

`.env*` fica no `.gitignore`; só `NEXT_PUBLIC_*` vai ao frontend.
