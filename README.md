# SocialHub PRO

Gerenciador de redes sociais multi-marca (SaaS) para agências: workspaces por marca/cliente, agendamento de posts, calendário, inbox, relatórios e workflow de aprovação externa por link.

> **Status:** MVP funcional. Autenticação, persistência de marcas/posts e RLS estão operacionais. A **publicação real nas redes (OAuth Instagram/YouTube/TikTok/etc.) ainda é simulada** — ver [Limitações](#limitações-conhecidas).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 |
| Estilo | Tailwind CSS 3 |
| UI | Radix UI, lucide-react, recharts |
| Backend / DB / Auth | Supabase (Postgres + Auth + RLS) |
| Deploy | Vercel |
| Automação (WIP) | MCP server em `mcp-servers/social-hub-mcp` (Node/Express) |

Navegação é por abas (estado em `App.jsx`), sem react-router. SPA servida via rewrite para `index.html`.

---

## Setup local

```bash
npm install
cp .env.example .env   # preencha as chaves (abaixo)
npm run dev            # http://localhost:5173
```

### Variáveis de ambiente (`.env`)

| Chave | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (ex: `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave `anon`/public do projeto |

> `.env` está no `.gitignore`. **Nunca** commitar chaves. Apenas a anon key vai ao frontend — service_role e tokens de rede social ficam no backend.

---

## Banco de dados (Supabase)

Migrações em `supabase/migrations/`:

- `20260706_initial_schema.sql` — tabelas base (`profiles`, `brands`, `posts`, `approval_comments`) + RLS + trigger de criação de perfil.
- `20260707_fix_schema_and_rls.sql` — colunas usadas pelo app, índices, `updated_at`, e **correção de RLS** (fecha vazamento entre clientes; aprovação pública passa a usar a RPC `get_post_by_approval_token`).

### Aplicar migrações

Opção 1 — Dashboard: SQL Editor → cola o conteúdo do arquivo → Run.

Opção 2 — Management API (com Personal Access Token da conta):

```bash
# não commitar o token; use variável de ambiente
node - <<'JS'
import { readFileSync } from 'node:fs';
const ref = process.env.SB_REF, token = process.env.SB_TOKEN;
const sql = readFileSync(process.env.SB_FILE, 'utf8');
const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
});
console.log(r.status, await r.text());
JS
```

### Modelo de dados (resumo)

- `profiles` — 1:1 com `auth.users` (gestor/agência).
- `brands` — marcas/clientes; `user_id → profiles.id`. Guarda canais conectados e `networks_metadata` (JSONB).
- `posts` — publicações; `brand_id → brands.id`; `status ∈ {draft, waiting_approval, scheduled, published, error}`; `approval_token` para link público.
- `approval_comments` — comentários do fluxo de aprovação externa.

**RLS:** cada usuário só enxerga/edita as próprias marcas e posts. O link público de aprovação lê 1 post via RPC por token (não expõe a tabela inteira).

---

## Deploy (Vercel)

1. Importar o repositório no Vercel.
2. Configurar env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) em Project Settings.
3. Build: `npm run build` · Output: `dist` (já em `vercel.json`).
4. No Supabase Auth, adicionar a URL de produção em **Redirect URLs** (para login Google/OAuth).

`vercel.json` já define rewrite SPA e headers de segurança (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).

---

## Estrutura

```
src/
  App.jsx                 # shell + navegação por abas
  main.jsx                # entrypoint + ErrorBoundary
  contexts/               # AuthContext, WorkspaceContext (estado global)
  pages/                  # Dashboard, Calendar, Scheduler, Inbox, Connections, Reports, ApprovalView
  components/             # auth, layout, scheduler, workspace, ErrorBoundary
  lib/                    # supabaseClient, utils
supabase/migrations/      # SQL versionado
mcp-servers/              # servidor de automação (WIP)
```

---

## Limitações conhecidas

- **Conexões de rede social são simuladas.** `Connections.jsx` não faz OAuth real — gera tokens/estatísticas fictícios para demonstração da interface. Publicação real requer: apps de desenvolvedor (Meta/Google/TikTok), backend para troca `code → token`, e callbacks registrados. Sinalizado como "modo demonstração" na própria tela.
- Métricas (seguidores/engajamento) são calculadas/estimadas no cliente, não vêm de APIs reais.
- Sem testes automatizados ainda.
- Sem observabilidade externa (Sentry/uptime) — apenas `console` + `ErrorBoundary`.

---

## Roadmap curto

1. OAuth real (começar por Meta/Instagram) via backend dedicado.
2. Publicação real e sincronização de métricas.
3. Testes dos fluxos críticos (login, CRUD de marca/post, aprovação).
4. Observabilidade (logs estruturados + uptime).
