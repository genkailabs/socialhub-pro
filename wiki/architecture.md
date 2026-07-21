---
title: Arquitetura e Stack Técnica
description: Stack técnica, estrutura de pastas e modelo de renderização do SocialHub PRO.
tags:
  - wiki
  - architecture
  - stack
---
# Arquitetura e Stack Técnica

Visão geral em [Visão geral](./overview.md). Rotas e fluxo de auth em [Rotas, auth e fluxo da aplicação](./app-flow.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14.2 (App Router), React 18.3 |
| UI | Tailwind CSS 3, Radix UI (`react-tabs`, `react-dialog`, `react-slot`, `react-tooltip` — só `react-tabs` está em uso ativo hoje), `lucide-react` (ícones), `recharts` (gráficos) |
| Utilitários de estilo | `class-variance-authority` (cva) + `clsx` + `tailwind-merge` via `lib/utils.js` (`cn()`) |
| Auth / DB | Supabase (Postgres + Auth + RLS + Storage) via `@supabase/ssr` e `@supabase/supabase-js` |
| IA | DeepSeek (texto), deAPI (imagem), Gemini/Gemini-image (clientes existentes, não usados no caminho principal — ver [Motor de conteúdo IA](./ai-engine.md)) |
| Testes | Vitest (unitário) + Playwright (e2e) |
| Deploy | Vercel (`vercel.json`), cron via Vercel Cron |
| Integração social real | Meta Graph API v21.0 (Instagram Business + Facebook Page) |

Sem TypeScript (JS puro, `.js`/`.jsx`), sem Redux/Zustand/Context global de dados — estado de servidor flui por Server Components + Server Actions, não por client-side fetch.

## Estrutura de pastas

```
app/                    # App Router: rotas, layouts, route handlers, server actions de página
  (app)/                # grupo de rotas autenticadas: dashboard, calendar, composer, connections,
                         # approvals, brand-kit, autopilot, ai-costs + brand-actions.js + layout.jsx (AppShell)
  api/                  # route handlers: meta/oauth|callback, social/sync|publish, render, cron/publish-due
  approve/[token]/      # página pública de aprovação (sem login)
  auth/callback/        # troca de code por sessão (Supabase OAuth/magic link)
  login/                # página + server actions de login/logout
components/             # componentes React por domínio (ver components.md)
data/                   # dados estáticos: nav.js (navegação), platforms.js (catálogo de redes)
lib/                    # camada de dados/serviços (ver database.md e ai-engine.md)
  supabase/             # client.js (browser), server.js (SSR/RLS), admin.js (service role)
  meta/                 # integração Graph API (graph.js, metrics.js)
  ai/                   # motor de conteúdo IA (providers, prompt, render, custo, dna/)
  color/                # extração de cor dominante (logo → paleta)
supabase/migrations/    # SQL versionado, aplicado manualmente via SQL Editor (ver decisions.md)
middleware.js           # guarda de sessão global (ver app-flow.md)
tests/                  # unit/ (Vitest) + e2e/ (Playwright)
legacy/                 # SPA Vite anterior, mantida como referência de porte
mcp-servers/            # servidor MCP standalone, desacoplado do app Next.js (ver mcp-server.md)
docs/superpowers/       # specs e planos do processo de desenvolvimento (brainstorming/plans)
```

## Modelo de renderização

- **Páginas são Server Components por padrão.** Cada página de `(app)/` segue o mesmo formato: resolve marcas (`listBrands`/`getActiveBrandId`/`resolveActive`), mostra `EmptyState` se não há marca ativa, e chama um fetcher específico em `lib/*-data.js`.
- **Interação vive em Client Components** (`'use client'`) — forms, wizards, dropdowns, modais. Componentes puramente apresentacionais (`AppShell`, `Topbar`, `BrandBadge`, `EmptyState`, `StatTile`, `FollowerTrend`, `DnaReport`) permanecem server-side.
- **Mutações via Server Actions** (`'use server'`), não via API routes: `app/login/actions.js`, `app/(app)/brand-actions.js`, e todos os `lib/*-actions.js` (posts, brand-kit, content-plan, approval, dna). API routes (`app/api/**`) existem só onde há chamada externa envolvida (OAuth callback, cron, render de imagem via `next/og`).
- **Cookie de marca ativa** (`active_brand_id`) persiste a seleção entre páginas; trocar/criar/apagar marca chama `revalidatePath('/', 'layout')` para atualizar toda a árvore.
- **Design tokens via CSS vars + Tailwind** (`tailwind.config.js`): cores semânticas (`bg-app`, `bg-surface`, `text-ink`, `text-accent` etc.) mapeadas para `rgb(var(--c-*) / <alpha-value>)`, permitindo dark mode via classe (`darkMode: 'class'`) sem duplicar utilitários. Sombras/animações customizadas (`shadow-soft/lift/glow/neon`, `ease-emphasized`) compõem a identidade visual "Studio Light" com toques "Neon Glass".
