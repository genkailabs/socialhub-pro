---
title: Componentes e Design System
description: Mapa de components/, convenções visuais e o fluxo do wizard de Brand DNA.
tags:
  - wiki
  - components
  - design-system
  - brand-dna
---
# Componentes e Design System

Rotas que renderizam esses componentes: [Rotas, auth e fluxo da aplicação](./app-flow.md). Camada de dados por trás deles: [Banco de dados](./database.md) e [Motor de conteúdo IA](./ai-engine.md).

## Árvore de `components/` (28 arquivos, 12 subpastas)

```
components/
├── ai/                 AIStudioPanel.jsx
├── approvals/          ApprovalsList.jsx            (visão da agência)
├── approve/            ApprovalForm.jsx              (visão pública do cliente)
├── autopilot/          AutopilotForm.jsx
├── brand-kit/          BrandKitForm.jsx, BrandKitShell.jsx, BrandKitTabs.jsx, DnaAnalyzer.jsx, DnaReport.jsx
│   └── wizard/         BrandWizard.jsx, DnaDashboard.jsx, options.js
├── calendar/           CalendarGrid.jsx, PostDetail.jsx
├── composer/           ComposerForm.jsx, ComposerTabs.jsx
├── connections/        ConnectionsBanner.jsx, ConnectionsSummary.jsx, PlatformCard.jsx
├── dashboard/          FollowerTrend.jsx, StatTile.jsx
├── layout/             AppShell.jsx, BrandSwitcher.jsx, Sidebar.jsx, Topbar.jsx
├── ui/                 Button.jsx, EmptyState.jsx, ThemeToggle.jsx
└── workspace/          BrandBadge.jsx, NewBrandModal.jsx
```

`approve/` (público, sem login) e `approvals/` (interno, visão da agência) são pastas distintas de propósito — não confundir.

## Por subpasta

- **ai/** — `AIStudioPanel.jsx`: aba "Gerar com IA" do composer. Chama `generatePost` (`lib/ai-actions.js`), mostra custo (texto DeepSeek + imagem deAPI/render), reusa as mesmas ações de publicação do composer manual.
- **approvals/** — `ApprovalsList.jsx`: posts `waiting_approval`, comentários do cliente, botão de copiar link `/approve/{token}`.
- **approve/** — `ApprovalForm.jsx`: 3 ações (Aprovar / Pedir ajustes / Só comentar) via `submitApproval`.
- **autopilot/** — `AutopilotForm.jsx`: toggle liga/desliga, posts/dia, formato visual, rotação de pilares de conteúdo, horários preferidos; salva via `saveContentPlan`; avisa se não há Brand Kit.
- **calendar/** — `CalendarGrid.jsx`: grid mensal (`lib/calendar.js`: `monthMatrix`, `groupPostsByDay`, `statusMeta`), legenda por status; abre `PostDetail.jsx` (modal com mídia, gera/copia link de aprovação, lista comentários).
- **composer/** — `ComposerTabs.jsx` alterna "Criar manual" (`ComposerForm`) × "Gerar com IA" (`AIStudioPanel`). `ComposerForm.jsx`: legenda, hashtags, primeiro comentário, upload multi-imagem direto pro Supabase Storage, preview estilo Instagram, publicar/agendar/rascunho/enviar-p/-aprovação.
- **connections/** — `ConnectionsBanner.jsx` (toast de status/erro do callback OAuth via query params), `ConnectionsSummary.jsx` (barra de progresso conectado/disponível/em breve), `PlatformCard.jsx` (por plataforma, usa `data/platforms.js`; "Em breve" para redes não integradas).
- **dashboard/** — `StatTile.jsx` (KPI genérico), `FollowerTrend.jsx` (mini-gráfico de barras CSS com tooltip/delta).
- **layout/** — `AppShell.jsx` (server: shell flex com Sidebar+Topbar+main), `Topbar.jsx` (server: hospeda `BrandSwitcher`, `ThemeToggle`, form de sign-out), `BrandSwitcher.jsx` (client: dropdown de marcas, chama `switchBrand`, abre `NewBrandModal`), `Sidebar.jsx` (navegação agrupada, ver `data/nav.js`).
- **ui/** — primitivos do design system: `Button.jsx` (único uso de cva encontrado: variantes primary/ghost/outline, tamanhos md/sm, mesclado com `cn()`), `EmptyState.jsx`, `ThemeToggle.jsx`.
- **workspace/** — `BrandBadge.jsx` (server, avatar de iniciais colorido), `NewBrandModal.jsx` (client: form nome/categoria/cor, submete `FormData` pra `createBrand`).

## Fluxo do wizard de Brand DNA (`components/brand-kit/`)

`BrandKitShell.jsx` escolhe o modo com base em `kit?.dna_generated_at`:

- **wizard** (primeira vez / "Refazer onboarding") → `wizard/BrandWizard.jsx`
- **dashboard** (logo após o wizard) → `wizard/DnaDashboard.jsx`
- **tabs** (edição normal) → `BrandKitTabs.jsx` (Radix `Tabs.Root`: aba "Análise" com `DnaAnalyzer.jsx`+`DnaReport.jsx`, aba "Editor" com `BrandKitForm.jsx`)

**`BrandWizard`** — wizard client de 6 passos (`STEP_TITLES` em `wizard/options.js`) com barra de progresso:

1. Sobre a empresa — nome (readonly), nicho, público, objetivo
2. Tom de voz — até 3 chips + texto livre "outro"
3. Personalidade — até 5 chips
4. Conteúdo — storytelling sim/não, uso de emoji, tamanho de legenda, política de CTA
5. Visual — estilo artístico, logo URL opcional com extração de cor dominante (`lib/color/dominant.js`), paleta de cores (accent/bg/surface/ink)
6. Fontes para a IA — toggles: manual (sempre ligado), bio+legendas do Instagram, URL do site, texto colado

Ao finalizar: `saveBrandKit` (respostas manuais) → `analyzeBrandDNA` (`lib/dna-actions.js`, com `{brandId, brandName, wantIg, websiteUrl, pastedText, manual}`) sintetiza o relatório de Brand DNA a partir de todas as fontes → `onComplete(summary)` troca pra `DnaDashboard`.

**`DnaDashboard`** — banner com frase de diagnóstico auto-gerada, cards de: Identidade, "Confiança do Brand DNA" (anel circular estilo Apple Activity Ring, `report.overall`×10), Tom de voz, Personalidade, Conteúdo, Visual, Fontes utilizadas (com incentivo a conectar Instagram se ausente). Ações: Editar Brand Kit, Gerar primeiro post (→ `/composer`), Conectar Instagram (→ `/connections`).

`DnaAnalyzer.jsx` (disponível a qualquer momento na aba Análise) deixa re-rodar `analyzeBrandDNA` e renderiza `DnaReport.jsx`: círculo de score geral, cards por categoria (branding/instagram/copy/design/growth/competitor) com selos de confiança (alta/média/baixa), listas de Forças/Fraquezas/Oportunidades + disclaimer.

`BrandKitForm.jsx` é o editor manual bruto (nicho, público, tom, pilares, dos/don'ts, personalidade, emoções, formalidade, emoji, CTA, estilo visual, tamanho de legenda, storytelling, paleta, logo) com preview local (não-IA) gerado a partir dos campos atuais.

## Convenções do design system

- **Tailwind puro**, sem CSS modules. Tokens semânticos (`bg-app`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`, `text-faint`, `text-accent`, `border-line`) + utilitários customizados (`ease-emphasized`, `shadow-soft/lift/neon`, `animate-pop/fade/rise`) definidos em `tailwind.config.js`.
- **`cn()` (clsx + tailwind-merge)** de `lib/utils.js` usado amplamente para composição condicional de classes, inclusive fora de `ui/` (ex.: `Sidebar.jsx`).
- **Radix** é dependência mas só `react-tabs` está de fato em uso (`BrandKitTabs.jsx`); modais e dropdowns (`PostDetail`, `NewBrandModal`, `BrandSwitcher`) são feitos à mão com `useState`/`useRef` e listeners manuais de click-outside/Escape.
- **`'use client'` é a norma** para qualquer coisa interativa; componentes server puros são a exceção (`AppShell`, `Topbar`, `BrandBadge`, `EmptyState`, `DnaReport`, `StatTile`, `FollowerTrend`).
- **Props simples** (sem TypeScript/PropTypes), callbacks nomeados `on*`.
- **`lucide-react`** é a única biblioteca de ícones.
- **Fluxo de dados**: componentes chamam server actions importadas diretamente (`saveBrandKit`, `analyzeBrandDNA`, `generatePost`, `publishNow/schedulePost/saveDraft/submitForApproval`, `requestApproval/submitApproval`, `saveContentPlan`, `createBrand`, `switchBrand`, `signOut`) — sem client-side fetch, exceto upload direto ao Supabase Storage em `ComposerForm.jsx`.
- **Helpers locais não exportados** (`Field`, `Section`, `Tip`, `Chips`, `Radios`, `Card`, `Ring` etc.) definidos no topo de vários arquivos em vez de extraídos pra `ui/` — o design system compartilhado é intencionalmente mínimo; a maior parte da composição é ad hoc por feature.
