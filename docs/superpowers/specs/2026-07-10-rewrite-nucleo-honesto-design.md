# Design Doc — Rewrite "Núcleo Honesto" (Next.js)

**Data:** 2026-07-10
**Status:** Em revisão
**Autor:** SocialHub PRO
**Substitui:** SPA Vite atual (`src/` + `api/`) — ver auditoria abaixo

---

## 1. Contexto e motivação

O produto (gerenciador de redes sociais multi-marca para agências) tem a integração **real do Instagram funcionando** (OAuth Meta, publicação e sync via Graph API v21.0). Porém, sobre essa base existe uma **camada "Demo"** que finge funcionalidades que não existem. O objetivo deste rewrite é entregar uma base **honesta**: só mostra o que é real, só permite o que funciona de verdade, e sinaliza claramente o que ainda não foi integrado.

### Auditoria — o que é fake hoje (a remover)

| # | Comportamento falso | Origem |
|---|---------------------|--------|
| 1 | Conectar TikTok/LinkedIn/X/Pinterest/Spotify finge OAuth com `setTimeout` + token falso `PROD_CLOUD_TOKEN_…` | `Connections.jsx` `handleConfirmRealConnection` |
| 2 | "Conexão manual" deixa o usuário **digitar nº de seguidores** que vira métrica exibida | `Connections.jsx` `handleManualConnection` |
| 3 | WhatsApp: QR falso, "Já escaneei" finge conexão | `Connections.jsx` modal QR |
| 4 | Publish em rede não-Meta retorna **falso sucesso** `mode:'sandbox'` | `api/social/publish.js` |
| 5 | Gráficos de Dashboard/Reports **fabricados** de fatores fixos (`[0.75, 0.82, …]`) | `Dashboard.jsx`, `Reports.jsx` |
| 6 | Inbox = conversas hardcoded (personas fictícias) | `Inbox.jsx` `INITIAL_CONVERSATIONS` |
| 7 | Métrica digitada pelo usuário retorna como `isRealApi:true` | `api/social/sync.js` `getBrandSavedNetworks` |

### Auditoria — segurança (corrigir no rewrite)

- **Meta App Secret commitado no repositório** (`api/meta/callback.js`). **Precisa ser rotacionado** — está no histórico do git e deve ser considerado comprometido. Ação do usuário no painel Meta.
- Chave `anon` do Supabase hardcoded como fallback em `api/*`.
- **Vazamento entre marcas:** fallback "buscar qualquer token ativo" + `name.ilike.genkailabs` hardcoded em `sync.js` fazem a Marca A ver dados da Marca B.

---

## 2. Escopo

### Dentro do v1 (núcleo honesto)

| Área | Entrega |
|------|---------|
| **Auth** | Supabase Auth (e-mail/senha + Google OAuth). Perfil 1:1. |
| **Workspaces / Marcas** | Multi-marca por usuário; seletor de marca ativa; CRUD de marca. |
| **Conexões** | Instagram/Facebook via **OAuth Meta real** (portado). Demais redes = card "Em breve" desabilitado. |
| **Composer** | Criar post (texto + mídia), publicar **agora** no Instagram, ou **agendar**. |
| **Agendamento** | Posts agendados publicados de verdade por um **cron** (Vercel Cron). |
| **Calendário** | Visualização mensal dos posts (rascunho / agendado / publicado / erro). |
| **Aprovação por link** | Link público por token; cliente aprova/comenta; RLS via RPC (sem expor tabela). |
| **Métricas reais IG** | Dashboard com dados vindos da Graph API (seguidores, engajamento, posts). Histórico acumula a partir de agora. |

### Fora do v1 (adiado, honestamente sinalizado)

- **Inbox** (DMs/comentários) — precisa das APIs de mensageria; entra quando integrarmos.
- **Relatórios multi-rede** — só há dado real de IG; adiado até haver mais redes.
- **Grid Planner visual**, **White-Label portal** — nice-to-have, fora do núcleo.
- **Demais redes reais** (TikTok, LinkedIn, YouTube publish, X, Pinterest) — cada uma vira um sub-projeto próprio depois desta base.

### Princípio inegociável

> **Nenhum dado exibido pode ser inventado.** Se não veio de uma API oficial ou de ação real do usuário, não aparece — mostra-se vazio/"conecte para ver"/"em breve".

---

## 3. Stack e arquitetura

| Camada | Tecnologia |
|--------|-----------|
| Framework | **Next.js (App Router)** — unifica frontend + API (Route Handlers) |
| UI | React 18, Tailwind CSS, Radix UI, lucide-react, recharts |
| Auth/DB | Supabase (Postgres + Auth + RLS) |
| Deploy | Vercel (build Next.js) + **Vercel Cron** para agendamento |
| Integrações | Meta Graph API v21.0 (IG/FB) — **lógica portada verbatim** do código atual comprovado |

**Decisão:** portar as sequências de Graph API já testadas (criação de container + polling `status_code` → `media_publish`; troca short→long-lived token; descoberta de conta IG Business via `/me/accounts`) para Route Handlers do Next.js, **sem re-derivar**. Reduz risco de reintroduzir bugs já resolvidos.

### Estrutura de pastas (alvo)

```
app/
  layout.jsx                 # shell raiz, providers
  (auth)/login/page.jsx
  (app)/
    layout.jsx               # sidebar + topbar + guarda de sessão
    dashboard/page.jsx
    composer/page.jsx
    calendar/page.jsx
    connections/page.jsx
    approvals/page.jsx
  approve/[token]/page.jsx   # rota pública de aprovação (sem sidebar)
  api/
    meta/oauth/route.js      # inicia OAuth (portado de api/meta/oauth.js)
    meta/callback/route.js   # callback + grava token (portado de api/meta/callback.js)
    social/publish/route.js  # publicação imediata (portado)
    social/sync/route.js     # sync de métricas reais (portado)
    posts/route.js           # CRUD de posts
    cron/publish-due/route.js # runner de agendados (novo)
components/
  ui/                        # primitivos (button, card, dialog, badge…)
  layout/                    # Sidebar, Topbar, BrandSwitcher
  connections/ composer/ calendar/ dashboard/ approvals/
lib/
  supabase/                  # client browser + server (service role isolado)
  meta/graph.js              # wrapper Graph API (fetch sequences portadas)
  format.js
data/platforms.js           # definição das redes + flag `integrated: bool`
supabase/migrations/         # SQL versionado (mantido/estendido)
```

**Nota de design (isolamento):** módulos pequenos e de responsabilidade única. Toda chamada a Graph API vive em `lib/meta/graph.js` (testável isolado); Route Handlers só orquestram (auth → chama lib → grava DB → responde). UI não fala com Graph API direto — sempre via Route Handler.

---

## 4. Modelo de dados (Supabase)

Reaproveita o schema atual; ajustes pontuais. Tabelas:

- `profiles` — 1:1 `auth.users`.
- `brands` — `id, user_id, name, connected_networks[], networks_metadata jsonb`.
- `posts` — `id, brand_id, title, content, media_url, status, scheduled_at, approval_token, published_at, created_at, updated_at`. `status ∈ {draft, waiting_approval, scheduled, published, error}`.
- `approval_comments` — comentários do fluxo público.
- `social_tokens` — `brand_id, platform, access_token, token_expires_at, platform_user_id, platform_username, platform_data jsonb, is_active, last_synced_at`. Único `(brand_id, platform)`.
- `social_sync_logs` — auditoria de sync/publish/oauth.
- `social_analytics_history` — snapshot diário por `(brand_id, platform, snapshot_date)`; base do histórico real (substitui gráficos fabricados).

### Mudanças

1. **RLS reforçada:** toda tabela filtra por `user_id`/`brand_id` do usuário autenticado. **Remover** o fallback "qualquer token ativo" e o hardcode `genkailabs`. Publish/sync recebem `brand_id` e validam posse.
2. `posts.scheduled_at timestamptz` garantido + índice para o cron (`status='scheduled' AND scheduled_at <= now()`).
3. Aprovação pública continua via **RPC `get_post_by_approval_token`** (não expõe a tabela).
4. Métricas: Dashboard lê **apenas** `social_analytics_history` (real, acumulado) + estado ao vivo da Graph API. Sem séries sintéticas.

---

## 5. Integrações e gating

- `data/platforms.js` ganha `integrated: boolean`. Só `instagram`/`facebook` = `true` no v1.
- **Conexões:** rede com `integrated:false` renderiza card "Em breve" **desabilitado** — sem modal de token manual, sem "conexão manual", sem QR falso.
- **Publish:** aceita **apenas** redes integradas. Rede não integrada não retorna sucesso — a UI nem oferece. Fim do `mode:'sandbox'`.
- **Facebook:** a conexão é real (a conta IG Business exige uma Página do Facebook vinculada, obtida no mesmo OAuth Meta). Porém o **alvo de publicação do v1 é o Instagram** — publicação no feed da Página do Facebook fica em "próximos passos" (§11), pois usa endpoint distinto.
- **Adicionar uma rede nova depois** = implementar OAuth + publish + sync reais e virar `integrated:true`. Cada rede é um sub-projeto.

---

## 6. Agendamento (novo, real)

1. Composer grava post `status='scheduled'`, `scheduled_at=<futuro>`.
2. **Vercel Cron** chama `POST /api/cron/publish-due` periodicamente (ex.: a cada 5 min), protegido por `CRON_SECRET`.
3. O handler busca posts vencidos, publica via `lib/meta/graph.js`, seta `published`/`error`, registra em `social_sync_logs`.
4. Calendário e Dashboard refletem o resultado real.

Limitação honesta: granularidade = intervalo do cron (não segundo-exato). Aceitável para o caso de uso.

---

## 7. Segurança e multi-tenancy

- **Todos os segredos em env vars.** Cliente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Servidor: `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID`, `META_APP_SECRET`, `CRON_SECRET`, `META_OAUTH_SCOPES`, `APP_URL`. Nenhum literal no código.
- **Service role key** só em código server-side (Route Handlers), nunca no bundle do cliente.
- **Rotacionar o Meta App Secret** exposto (ação manual do usuário no Meta Developers) — pré-requisito de deploy.
- RLS valida posse de marca em toda query. Remover fallbacks que cruzam marcas.
- Headers de segurança (`X-Frame-Options` etc.) via `next.config`/middleware.

---

## 8. Direção visual — "Studio Light"

Tokens (Tailwind):

- Fundo app: `#F7F8FA`; superfícies: `#FFFFFF`; bordas: `#ECEEF2`.
- Tinta: `#1F2430`; texto secundário: `#8B93A3`.
- **Acento primário: violeta `#6366F1`** (+ apoio `#A855F7`). Toque de cor viva permitido em gradientes/estados, sem virar "arco-íris".
- Estados: conectado `emerald`, erro `red`, "em breve" `gray`.
- Raio: `xl` (12px) em cards; sombra suave (`0 1px 3px rgba(16,20,40,.08)`).
- Tipografia: system-ui, títulos `800`, densidade confortável (muito respiro).

### Navegação (IA) — validada

Sidebar agrupada:

- **Conteúdo:** Dashboard · Composer · Calendário
- **Redes:** Conexões
- **Cliente:** Aprovações
- **Em breve** (desabilitado, selo `soon`): Inbox · Relatórios

Topo: seletor de marca ativa + menu do usuário. Conexões mostra: conectadas (selo `● real`) → disponível agora (Facebook, "OAuth real") → "Em breve" (cards cinza, "Indisponível").

---

## 9. Estratégia de migração

- Trabalho em **branch dedicada** (não na `main`).
- Rewrite **substitui** `src/` (Vite SPA) e `api/*` (serverless soltos) pela estrutura Next.js. `supabase/migrations/` é **mantido e estendido** (o banco não é recriado — dados de IG/marcas preservados).
- `mcp-servers/` fora de escopo (não tocar).
- Ordem por milestones (vira o plano de implementação):
  1. **M1 — Fundação:** scaffold Next.js, Tailwind/Studio Light, Supabase client server/browser, Auth + guarda de rota, layout shell (sidebar/topbar/brand switcher).
  2. **M2 — Marcas:** CRUD de marca, seletor de marca ativa, contexto/estado.
  3. **M3 — Conexões + IG real:** portar OAuth/callback/publish/sync; gating "Em breve"; RLS corrigida; segredos em env.
  4. **M4 — Composer + Agendamento:** criar/publicar/agendar; upload de mídia (Supabase Storage); Vercel Cron `publish-due`.
  5. **M5 — Calendário + Aprovação + Dashboard real:** calendário de posts; fluxo público de aprovação via RPC; dashboard só com métricas reais/histórico.

Cada milestone é entregável e verificável isolado.

---

## 10. Critérios de aceitação

- [ ] Nenhuma conexão falsa: só IG/FB conectam; demais são "Em breve" desabilitado.
- [ ] Nenhuma métrica inventada: Dashboard/qualquer número vem de Graph API ou `social_analytics_history`. Sem fatores sintéticos.
- [ ] Publish só em rede integrada; sem `mode:'sandbox'`; sem falso sucesso.
- [ ] Inbox e Relatórios não aparecem como funcionais (marcados "Em breve").
- [ ] Agendar um post → cron publica de verdade no IG no horário; status vira `published`.
- [ ] Aprovação por link funciona via RPC sem vazar a tabela `posts`.
- [ ] RLS: usuário só vê marcas/posts/tokens próprios; sem fallback cruzando marcas; sem hardcode `genkailabs`/`default-brand-pro`.
- [ ] Zero segredo hardcoded no código; Meta App Secret rotacionado.
- [ ] Instagram real (OAuth + publish + sync) continua funcionando após o rewrite (sem regressão).
- [ ] Visual "Studio Light" aplicado; navegação agrupada conforme validado.

---

## 11. Próximos passos (pós-v1)

Integração real das demais redes, uma por vez, cada uma virando `integrated:true`: Facebook publish → YouTube → TikTok → LinkedIn → X → Pinterest. Depois: Inbox e Relatórios multi-rede quando houver ≥2 redes com dado real.
