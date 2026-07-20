# SocialHub PRO

Gerenciador de redes sociais multi-marca (SaaS) para agências: workspaces por marca/cliente, agendamento de posts, calendário, relatórios e workflow de aprovação externa por link.

> 📚 Documentação completa (arquitetura, banco de dados, motor de IA, decisões de projeto) na [wiki](./wiki/overview.md).

> **Status:** rewrite em andamento para **Next.js (App Router)** — base "Núcleo Honesto". A integração **real do Instagram** (OAuth Meta + publicação + métricas via Graph API v21.0) é preservada; as demais redes aparecem como **"Em breve"** até terem integração real. **Nada de dados simulados.** Ver [docs/superpowers/specs/2026-07-10-rewrite-nucleo-honesto-design.md](docs/superpowers/specs/2026-07-10-rewrite-nucleo-honesto-design.md).
>
> Milestone atual: **M1 (Fundação)** — Next.js, auth Supabase, shell Studio Light. Milestones seguintes (M2–M5) portam marcas, conexões reais do IG, composer/agendamento, calendário/aprovação/dashboard. O código Vite anterior está em `legacy/` como referência para portar.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, Tailwind CSS 3, Radix UI, lucide-react, recharts |
| Auth / DB | Supabase (Postgres + Auth + RLS) via `@supabase/ssr` |
| Testes | Vitest (unit) + Playwright (e2e) |
| Deploy | Render |
| Integração real | Meta Graph API v21.0 (Instagram/Facebook) |

---

## Setup local

```bash
npm install
cp .env.example .env.local   # preencha as chaves (abaixo)
npm run dev                  # http://localhost:3000
```

### Variáveis de ambiente (`.env.local`)

| Chave | Onde | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente | Chave `anon`/public |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | Service role (usada só server-side; M3) |
| `META_APP_ID` / `META_APP_SECRET` | servidor | App Meta para OAuth do Instagram (M3) |
| `META_OAUTH_SCOPES` | servidor | Escopos do OAuth Meta |
| `APP_URL` | servidor | URL pública (callbacks) |
| `CRON_SECRET` | servidor | Protege o cron de agendamento (M4) |

> `.env*` está no `.gitignore`. **Nunca** commitar chaves. Só as `NEXT_PUBLIC_*` vão ao frontend — service role e segredos da Meta ficam no servidor.
>
> ⚠️ **Segurança:** o `META_APP_SECRET` que estava commitado no histórico do git deve ser **rotacionado** no painel Meta Developers antes de reutilizar — considere-o comprometido.

### Comandos

```bash
npm run dev      # dev server (porta 3000)
npm run build    # build de produção
npm run test     # testes unitários (Vitest)
npm run e2e      # testes e2e (Playwright)
```

---

## Banco de dados (Supabase)

Migrações em `supabase/migrations/`. Modelo (resumo):

- `profiles` — 1:1 com `auth.users` (gestor/agência).
- `brands` — marcas/clientes; `user_id → profiles.id`; guarda `connected_networks[]` e `networks_metadata` (JSONB).
- `posts` — publicações; `brand_id → brands.id`; `status ∈ {draft, waiting_approval, scheduled, published, error}`; `approval_token` para link público.
- `approval_comments` — comentários do fluxo de aprovação externa.
- `social_tokens` — tokens OAuth reais por marca/plataforma (único `brand_id,platform`).
- `social_sync_logs`, `social_analytics_history` — auditoria e histórico real de métricas.

**RLS:** cada usuário só enxerga/edita as próprias marcas e posts. O link público de aprovação lê 1 post via RPC por token. (Correção do vazamento entre marcas entra no M3.)

---

## Deploy (Render)

URL de produção: https://socialhub-pro-1.onrender.com

1. O serviço Render usa `render.yaml`.
2. Configurar env vars (as `NEXT_PUBLIC_*` e as de servidor) no painel do Render.
3. No Supabase Auth, adicionar `https://socialhub-pro-1.onrender.com/auth/callback` em **Redirect URLs**.

Headers de segurança são definidos em `next.config.js`.

---

## Estrutura

```
app/               # App Router: layout, login, auth/callback, (app)/{dashboard,composer,calendar,connections,approvals}
components/         # ui/ (primitivos) + layout/ (Sidebar, Topbar, AppShell, BrandSwitcher)
lib/               # supabase/ (client+server), utils
data/              # nav.js (navegação)
middleware.js      # guarda de sessão
tests/             # unit (Vitest) + e2e (Playwright)
supabase/migrations/  # SQL versionado
legacy/            # SPA Vite anterior (referência p/ portar IG nos próximos milestones)
docs/superpowers/  # specs e plans
```

---

## Limitações conhecidas (M1)

- Redes além de Instagram/Facebook aparecem como **"Em breve"** (sem integração ainda) — por design, não por simulação.
- Inbox e Relatórios multi-rede ficam fora do núcleo até haver dado real.
- Conexão real do IG, composer, agendamento e aprovação chegam nos milestones M2–M5.

## Notas de simplificação (2026-07-20)

- **Piloto Automático despublicado (RF-06/07/08).** A rota `/autopilot` virou `/strategy`, contendo só o `StrategyPanel` (pilares/objetivos que o Planejamento consome). O `AutopilotForm` e o toggle `content_plans.active` saíram da interface. `lib/autopilot.js`, `lib/content-plan-actions.js`, `content_plans` e os testes **continuam no código** — apenas deixaram de ser expostos até haver decisão de produto sobre reativar a geração diária como algo separado e opcional.
- **Impacto em produção: nenhum.** `runDailyAutopilot` não é chamado por nenhum cron/rota/Edge Function hoje, então marcas com `content_plans.active = true` não geravam nada e continuam sem gerar. Remover a UI não muda comportamento em produção.
- A barra de onboarding (`PipelineProgress`) foi reescrita para a jornada real — Brand Kit → Estratégia → Planejar semana → Aprovar & agendar → Publicar — deixando de prometer geração automática diária.
