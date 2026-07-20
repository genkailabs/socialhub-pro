# STACK ATUAL — Gerenciador de Redes Sociais

> Fonte de verdade rápida de "onde roda o quê". Atualize quando a infra mudar.
> Confirmado pelo dono abrindo o painel — não deduzido de arquivo. Última revisão: 2026-07-20

## TL;DR

| Camada | Onde roda HOJE | Observação |
|---|---|---|
| **App (Next.js)** | **Railway** — `https://socialhub-mvp-production.up.railway.app` | Confirmado pelo dono. Código/docs (README, `.env`, `render.yaml`, `config.toml`) ainda citavam Render/Vercel — **estavam desatualizados**, corrigidos nesta revisão. |
| **Banco / Auth / Storage** | **Supabase** (projeto `geoqbbrlyepmhwgdbjmz`) | Independente de onde o Next.js roda. |
| **Cron / Edge Functions** | **Supabase** (`publish-due-posts`, `youtube-sync`) | Migrados do Railway p/ Supabase em 19/07. |

⚠️ **Havia 3 domínios espalhados no projeto** (Render, Vercel, Railway) sem um bater com a realidade. Causa raiz do bug "URL bloqueada" no Meta OAuth em 2026-07-20. Se isso acontecer de novo, é sinal de doc desatualizada — confirmar direto no painel que o dono usa, não em arquivo.

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

**Estado em 2026-07-20:** allowlist do Meta tinha `socialhub-pro-1.onrender.com` E `socialhub-pro-steel.vercel.app`, nenhum dos dois o domínio real. Adicionado `socialhub-mvp-production.up.railway.app/api/meta/callback`. **Falta confirmar:** `APP_URL` está setado certo nas env vars do Railway? (painel, não visível daqui).

## App

- **Next.js** `^14.2.15`, **React** `^18.3.1`
- Node `20.18.0` / local `v24.16.0`
- Build: `npm ci && npm run build` · Start: `npm start`
- Healthcheck: `/login` (`railway.json`)
- Config Railway versionada: `railway.json` na raiz

## Arquivos desatualizados a vigiar (citam host errado)

- `README.md` — cita onrender como "URL de produção"
- `.env` local — `VITE_APP_URL=...onrender.com` (parece resquício da era Vite/legacy, `VITE_*` não é lido pelo Next.js)
- `render.yaml` — ainda na raiz, referência do host antigo (Render), não removido
- `PRD_Infraestrutura_Producao_Railway.md` — tratava Railway como migração futura; na prática já é o host vivo

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
