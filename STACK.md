# STACK ATUAL — Gerenciador de Redes Sociais

> Fonte de verdade rápida de "onde roda o quê". Atualize quando a infra mudar.
> Confirmado pelo dono abrindo o painel — não deduzido de arquivo. Última revisão: 2026-07-20

## TL;DR

| Camada | Onde roda HOJE | Observação |
|---|---|---|
| **App (Next.js)** | **Railway** — `https://socialhub-mvp-production.up.railway.app` | Confirmado pelo dono e configurado por `railway.json`. |
| **Banco / Auth / Storage** | **Supabase** (projeto `geoqbbrlyepmhwgdbjmz`) | Independente de onde o Next.js roda. |
| **Cron / Edge Functions** | **Supabase** (`publish-due-posts`, `youtube-sync`) | Migrados do Railway p/ Supabase em 19/07. |

⚠️ Se aparecer outro domínio no fluxo OAuth, confirme o domínio ativo diretamente no painel do Railway e mantenha `APP_URL`, Meta e Supabase Auth sincronizados.

## Domínio de produção (o que os callbacks usam)

`APP_URL` deve ser `https://socialhub-mvp-production.up.railway.app` (sem `/` final).

Usado em:
- Meta OAuth callback: `app/api/meta/callback/route.js` → `${APP_URL}/api/meta/callback`
- YouTube OAuth callback: `app/api/youtube/callback/route.js`
- Supabase Auth redirect: `supabase/config.toml` `site_url` (corrigido nesta revisão)
- `middleware.js`

**Regra:** se o domínio mudar de novo, atualizar EM PARALELO:
1. Redirect URIs no app do **Facebook Developer** (manual, painel Meta) — senão "URL bloqueada".
2. Redirect URLs no **Supabase Auth** (painel Supabase, Auth → URL Configuration).
3. `site_url`/`additional_redirect_urls` em `supabase/config.toml` (repo).
4. `APP_URL` nas env vars do **Railway** (painel Railway).

**Estado esperado:** `socialhub-mvp-production.up.railway.app/api/meta/callback` deve estar permitido no Meta. Confirmar também `APP_URL` nas env vars do Railway.

## App

- **Next.js** `^14.2.15`, **React** `^18.3.1`
- Node `20.18.0` / local `v24.16.0`
- Build: `npm ci && npm run build` · Start: `npm start`
- Healthcheck: `/login` (`railway.json`)
- Config Railway versionada: `railway.json` na raiz

## Chaves de ambiente (servidor, Railway)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`APP_URL`, `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_SCOPES`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `POLLINATIONS_SECRET_KEY`, `DEAPI_API_KEY`,
`CRON_SECRET`, `SENTRY_DSN`.

## Integrações sociais

- **Instagram / Facebook:** Meta Graph OAuth real — `lib/meta/graph.js`, `app/api/meta/*`.
- **YouTube:** Google OAuth real — `lib/youtube/google.js`, `app/api/youtube/*`.
- Outras redes: eram mock, em remoção.
