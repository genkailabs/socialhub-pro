---
title: Rotas, Auth e Fluxo da Aplicação
description: Mapa de rotas do App Router, guarda de sessão (middleware) e rotas de API do SocialHub PRO.
tags:
  - wiki
  - routing
  - auth
  - api
---
# Rotas, Auth e Fluxo da Aplicação

Ver stack e pastas em [Arquitetura e stack](./architecture.md). Componentes renderizados por cada rota em [Componentes e design system](./components.md).

## Mapa de rotas

| Rota | Arquivo | Tipo | Propósito |
|---|---|---|---|
| `/` | `app/page.jsx` | Server | Redireciona para `/dashboard` ou `/login` conforme sessão |
| `/login` | `app/login/page.jsx` | Client | Login por e-mail/senha + Google OAuth |
| `/auth/callback` | `app/auth/callback/route.js` | Route handler (GET) | Troca `code` do Supabase por sessão |
| `/dashboard` | `app/(app)/dashboard/page.jsx` | Server | Métricas reais do Instagram + tendência de seguidores da marca ativa |
| `/calendar` | `app/(app)/calendar/page.jsx` | Server | Calendário editorial (grid mensal) dos posts da marca |
| `/composer` | `app/(app)/composer/page.jsx` | Server (renderiza `ComposerTabs` client) | Criação de post — manual ou via IA; requer conexão IG |
| `/connections` | `app/(app)/connections/page.jsx` | Server | Lista plataformas conectadas/disponíveis/"em breve" |
| `/approvals` | `app/(app)/approvals/page.jsx` | Server | Posts aguardando aprovação do cliente |
| `/brand-kit` | `app/(app)/brand-kit/page.jsx` | Server | Brand DNA (tom, cores, regras) usado na geração de IA |
| `/autopilot` | `app/(app)/autopilot/page.jsx` | Server | Configuração do "Piloto Automático" de geração diária |
| `/ai-costs` | `app/(app)/ai-costs/page.jsx` | Server | Dashboard de custo/uso de tokens (DeepSeek/deAPI) |
| `/approve/[token]` | `app/approve/[token]/page.jsx` | Server, pública | Página de aprovação tokenizada, sem login |

Arquivos de suporte (não são rotas): `app/layout.jsx` (shell raiz + script de tema), `app/(app)/layout.jsx` (gate de auth + `AppShell`), `app/(app)/brand-actions.js` (server actions de marca compartilhadas pelas páginas do grupo).

## Rotas de API

| Rota | Método | Auth | O que faz |
|---|---|---|---|
| `/api/meta/oauth` | GET | Sessão + posse da marca (`brand_id`) | Monta `state` (base64 JSON) e redireciona pro OAuth da Meta com escopos incl. `instagram_content_publish`, `business_management` |
| `/api/meta/callback` | GET | Sessão (valida `state.uid === user.id` + posse) | Troca `code` → token curto → token longo, descobre conta IG Business, faz upsert em `social_tokens` |
| `/api/social/sync` | GET (`?brand_id=`) | Sessão + posse (403 se não dono) | Busca métricas reais do Instagram via Graph API (`getBrandInstagramMetrics`) |
| `/api/social/publish` | POST | Sessão | Publica uma imagem no Instagram (`publishInstagramImage`) |
| `/api/render` | POST | Sessão | Rasteriza uma slide de criativo em PNG via `next/og` (`lib/ai/render.jsx`) |
| `/api/cron/publish-due` | GET | `Authorization: Bearer $CRON_SECRET` (sem sessão de usuário, client `admin` service-role) | Publica até 10 posts `scheduled` vencidos + roda o Piloto Automático diário se `DEEPSEEK_API_KEY` existir |

## Guarda de sessão (`middleware.js`)

1. Casa quase todos os paths (exclui `_next/static`, `_next/image`, `favicon.ico` e extensões de imagem via `matcher`).
2. Cria um client Supabase SSR ligado aos cookies da request/response (refresca cookies de sessão na response).
3. Chama `supabase.auth.getUser()`.
4. `PUBLIC = ['/login', '/auth', '/approve', '/api']` — qualquer rota igual ou prefixada por um desses escapa do redirect. **`/api/*` fica de fora de propósito**: rotas de API se autenticam sozinhas (sessão via cookie, ou bearer `CRON_SECRET` no cron).
5. Sem usuário e rota não-pública → `redirect('/login')`.
6. **Defesa em profundidade:** `app/(app)/layout.jsx` re-checa `supabase.auth.getUser()` no server antes de carregar marcas e renderizar `AppShell`.

## Fluxo de login

- `app/login/page.jsx` (client) chama a server action `signInWithPassword` (`app/login/actions.js`) → `supabase.auth.signInWithPassword` → `redirect('/dashboard')`, ou retorna `{error}` renderizado inline.
- Login Google: client-side `supabase.auth.signInWithOAuth({provider:'google', redirectTo: '${origin}/auth/callback'})`.
- `app/auth/callback/route.js` recebe `code`, chama `exchangeCodeForSession(code)`, redireciona para `/dashboard` (sem branch de erro).
- `signOut` (mesma server action file) chama `supabase.auth.signOut()` + `redirect('/login')`.

## Fluxo de aprovação externa (sem login)

`/approve/[token]` usa um client Supabase SSR **sem** checagem de usuário e chama a RPC `get_post_by_approval_token(p_token)` — controle de acesso é via token opaco, não via sessão (ver [Banco de dados](./database.md) para a função RPC e RLS relacionada).

## Padrões notados

- **Server actions em vez de API routes** para mutações internas (login/logout, CRUD de marca, posts, brand-kit, aprovação, content-plan) — API routes existem só quando há chamada externa (OAuth, cron, `next/og`).
- **Cookie de marca ativa** compartilhado entre páginas; mutações de marca disparam `revalidatePath('/', 'layout')`.
- **Clients Supabase diferentes por contexto**: SSR (cookie/RLS) nas páginas/actions normais; `admin` (service role) só no cron, que não tem sessão de usuário.
- **Filosofia "só dado real"**: erros explícitos (502, mensagens) em vez de fallback simulado quando a Graph API falha.
