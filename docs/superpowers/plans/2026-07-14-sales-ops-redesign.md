# Redesign Sales-Ops (Modo Escuro Esmeralda/Ardósia) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Modo Escuro (`.dark`) do `socialhub` na estética analítica e de alto contraste do `sales-ops-dashboard` (fundos Ardósia/Grafite profundo, acento Verde Esmeralda e tipografia DM Sans), evoluindo os componentes `StatTile`, `Topbar`, `Sidebar`, `FollowerTrend` e `YoutubePanel` enquanto preserva a integridade do Modo Claro (`:root`).

**Architecture:** Estratégia híbrida de tokens via CSS Custom Properties (`app/globals.css`) e extensões no `tailwind.config.js`. O mesmo código JSX se adapta organicamente através de classes semânticas (`bg-surface`, `border-line`, `text-accent`, `shadow-soft`). No modo escuro (`.dark`), as variáveis assumem os valores Esmeralda/Ardósia, ativando a fonte DM Sans e gradientes de hover ambientais (`from-accent/5 to-transparent`).

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS v3, Vitest (para validação de suíte regressiva).

## Global Constraints

- Manter 100% de aprovação na suíte de testes unitários existente (`npm test` / 78 testes).
- Manter compilação bem-sucedida do build de produção (`npm run build`).
- Preservar o bloco `:root` intacto para o Modo Claro (Índigo + Outfit).
- Não utilizar placeholders (`TODO`, `TBD`) ou trechos incompletos nas etapas de código.

---

### Task 1: Consolidação de Branch e Tokens Esmeralda/Ardósia (`globals.css` e `tailwind.config.js`)

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.js`
- Test: Suíte regressiva global e build (`npm test && npm run build`)

**Interfaces:**
- Produces: Variáveis globais `--c-app: 22 22 24`, `--c-surface: 31 31 35`, `--c-surface-2: 39 39 45`, `--c-accent: 16 185 129` no bloco `.dark`, e classes `font-sans` adaptáveis com `DM Sans` e `Outfit`.

- [ ] **Step 1: Comitar pendências do branch anterior (`feat/brand-dna-ai`) e criar branch dedicado (`feat/sales-ops-redesign`)**

Execute:
```powershell
git add app/ components/ lib/ wiki/ DESIGN.md README.md tailwind.config.js
git commit -m "feat(youtube, brand-kit): consolidação final de rotas OAuth, onboarding e UI polish"
git checkout -b feat/sales-ops-redesign
```

Expected: Branch `feat/sales-ops-redesign` criado com diretório de trabalho limpo (ou apenas o spec anterior modificado/commitado).

- [ ] **Step 2: Atualizar `app/globals.css` adicionando a fonte DM Sans e redefinindo os tokens `.dark` para Esmeralda/Ardósia**

Substitua o conteúdo de `app/globals.css` pelo seguinte código completo:
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Finly High-End Dashboard — Light Mode Canvas & Tokens */
  --c-app: 246 245 250; /* #F6F5FA - Canvas respirável com tom lavanda acinzentado */
  --c-surface: 255 255 255; /* #FFFFFF - Cartões brancos puros */
  --c-surface-2: 240 238 246; /* #F0EEF6 - Hover de itens e inputs */
  --c-line: 226 232 240; /* #E2E8F0 - Bordas divisórias de 1px */
  --c-line-strong: 203 213 225;
  --c-ink: 24 24 27; /* #18181B - Charcoal Ink alto contraste */
  --c-muted: 113 113 122; /* #71717A - Muted Steel secundário */
  --c-faint: 161 161 170; /* #A1A1AA */

  /* acento — Indigo/Violet calibrado (#6366F1), sem neon glow */
  --c-accent: 99 102 241;
  --c-accent-soft: 129 140 248;
  --c-accent-tint: 238 242 255;
  --c-accent-ink: 67 56 202;

  /* estados semânticos */
  --c-success: 16 185 129;
  --c-warning: 245 158 11;
  --c-danger: 244 63 94;
  --c-info: 99 102 241;

  --c-shadow: 24 24 27;
  --c-glow: 99 102 241;
  color-scheme: light;
}

.dark {
  /* Sales-Ops Emerald & Slate — Dark Mode Canvas & Tokens */
  --c-app: 22 22 24; /* #161618 - Slate-Navy profundo */
  --c-surface: 31 31 35; /* #1F1F23 - Cartões elevados escuros */
  --c-surface-2: 39 39 45; /* #27272D - Hover e inputs */
  --c-line: 255 255 255; /* usado com opacidade 0.08 a 0.12 nas bordas */
  --c-line-strong: 82 82 91; /* #52525B */
  --c-ink: 244 244 246; /* #F4F4F6 - Crisp Text Ink */
  --c-muted: 156 163 175; /* #9CA3AF - Muted Lavender Gray */
  --c-faint: 113 113 122;

  /* acento — Verde Esmeralda/Mint calibrado (#10B981) */
  --c-accent: 16 185 129;
  --c-accent-soft: 52 211 153;
  --c-accent-tint: 18 42 36;
  --c-accent-ink: 209 250 229;

  /* estados semânticos */
  --c-success: 16 185 129;
  --c-warning: 245 158 11;
  --c-danger: 244 63 94;
  --c-info: 16 185 129;

  --c-shadow: 0 0 0;
  --c-glow: 16 185 129;
  color-scheme: dark;
}

/* Base resets & utilities */
@layer base {
  body {
    background-color: rgb(var(--c-app));
    color: rgb(var(--c-ink));
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
    -webkit-font-smoothing: antialiased;
  }
}

.glass {
  background: rgb(var(--c-surface) / 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgb(var(--c-line) / 0.12);
}

.dark .glass {
  background: rgb(var(--c-surface) / 0.88);
  border: 1px solid rgb(var(--c-line) / 0.08);
}

.glow-accent {
  box-shadow: 0 0 0 1px rgb(var(--c-accent) / 0.25), 0 10px 30px -10px rgb(var(--c-accent) / 0.35);
}

.dark .font-theme {
  font-family: 'DM Sans', system-ui, sans-serif;
}
```

- [ ] **Step 3: Atualizar `tailwind.config.js` incorporando DM Sans e sombras dinâmicas**

Substitua o conteúdo de `tailwind.config.js` pelo seguinte código completo:
```javascript
/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './data/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: c('--c-app'),
        surface: { DEFAULT: c('--c-surface'), 2: c('--c-surface-2') },
        line: { DEFAULT: c('--c-line'), strong: c('--c-line-strong') },
        ink: c('--c-ink'),
        muted: c('--c-muted'),
        faint: c('--c-faint'),
        accent: {
          DEFAULT: c('--c-accent'),
          soft: c('--c-accent-soft'),
          tint: c('--c-accent-tint'),
          ink: c('--c-accent-ink')
        },
        success: c('--c-success'),
        warning: c('--c-warning'),
        danger: c('--c-danger'),
        info: c('--c-info')
      },
      boxShadow: {
        soft: '0 1px 3px rgb(var(--c-shadow) / 0.08), 0 8px 24px rgb(var(--c-shadow) / 0.12)',
        lift: '0 4px 14px rgb(var(--c-shadow) / 0.12), 0 28px 60px rgb(var(--c-shadow) / 0.22)',
        glow: '0 0 0 4px rgb(var(--c-accent) / 0.18)',
        neon: '0 10px 34px -8px rgb(var(--c-glow) / 0.45), 0 0 0 1px rgb(var(--c-glow) / 0.18)'
      },
      borderRadius: { lg: '16px', xl: '20px', '2xl': '24px', '3xl': '32px', '4xl': '40px' },
      fontFamily: {
        sans: [
          'DM Sans', 'Outfit', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
          'Segoe UI', 'Roboto', 'system-ui', 'sans-serif'
        ],
        display: ['Outfit', 'DM Sans', 'Geist', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      transitionTimingFunction: { emphasized: 'cubic-bezier(.22,1,.36,1)' }
    }
  },
  plugins: []
};
```

- [ ] **Step 4: Rodar suíte de testes unitários e build de verificação**

Execute:
```powershell
npm test && npm run build
```

Expected: Todos os 78 testes regressivos devem passar (`All tests passed in vitest`). O build do Next.js deve concluir sem erros (`Compiled successfully`).

- [ ] **Step 5: Comitar as alterações de fundação global**

Execute:
```powershell
git add app/globals.css tailwind.config.js
git commit -m "feat(ui): tokens dark mode esmeralda/ardósia e tipografia DM Sans"
```

---

### Task 2: Reestilização Híbrida do Card de Métricas (`components/dashboard/StatTile.jsx`)

**Files:**
- Modify: `components/dashboard/StatTile.jsx`
- Test: Suíte regressiva global (`npm test`)

**Interfaces:**
- Consumes: Variáveis globais `--c-accent`, `--c-surface`, `font-mono`.
- Produces: `StatTile` interativo com suporte a `change` (ex: `"+12.4%"`) e `changeType` (`"positive" | "negative" | "neutral"`).

- [ ] **Step 1: Atualizar `components/dashboard/StatTile.jsx` aplicando o layout e micro-interações do MetricCard do Sales-Ops**

Substitua o conteúdo de `components/dashboard/StatTile.jsx` pelo seguinte código completo:
```jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatTile({ label, value, hint, icon: Icon, accent, change, changeType = 'positive' }) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 ease-emphasized ${
      accent 
        ? 'bg-surface border-accent/40 shadow-soft glow-accent hover:border-accent' 
        : 'bg-surface border-line/80 dark:border-line/40 shadow-soft hover:border-accent/50 dark:hover:border-accent/50'
    }`}>
      {/* Gradiente sutil em hover (Ambient Glow) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        {Icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-lg transition-colors duration-300 ${
            accent 
              ? 'bg-accent text-white shadow-md shadow-accent/25' 
              : 'bg-surface-2 text-muted group-hover:bg-accent/10 group-hover:text-accent'
          }`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className={`font-mono text-2xl lg:text-3xl font-bold leading-none tracking-tight tabular-nums ${
            accent ? 'text-accent dark:text-accent-soft' : 'text-ink'
          }`}>
            {value}
          </p>
          {hint && <p className="mt-1.5 font-mono text-[11px] text-muted">{hint}</p>}
        </div>

        {change && (
          <div className={`flex items-center gap-1 text-xs font-bold mb-0.5 ${
            isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-muted'
          }`}>
            {isPositive && <TrendingUp className="h-3.5 w-3.5 shrink-0" />}
            {isNegative && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rodar testes unitários para verificar regressão no StatTile**

Execute:
```powershell
npm test
```

Expected: Os testes unitários que passam pelo dashboard e pelas métricas devem passar 100% verde sem erros de renderização ou prop ausente.

- [ ] **Step 3: Comitar a evolução do StatTile**

Execute:
```powershell
git add components/dashboard/StatTile.jsx
git commit -m "feat(ui): reestiliza StatTile com design e interações do MetricCard (Sales-Ops)"
```

---

### Task 3: Reestilização do Cabeçalho / Topbar (`components/layout/Topbar.jsx`)

**Files:**
- Modify: `components/layout/Topbar.jsx`
- Test: Suíte regressiva global (`npm test && npm run build`)

**Interfaces:**
- Consumes: `BrandSwitcher`, `ThemeToggle`, utilitários de animação e foco Tailwind.
- Produces: Barra superior sticky com campo de busca com expansão animada (`w-48 focus:w-64`) e ponto pulsante em notificações.

- [ ] **Step 1: Atualizar `components/layout/Topbar.jsx` com busca animada e glassmorphism refinado**

Substitua o conteúdo de `components/layout/Topbar.jsx` pelo seguinte código completo:
```jsx
'use client';
import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { BrandSwitcher } from './BrandSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { signOut } from '@/app/login/actions';

export function Topbar({ brands, activeId }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line/80 dark:border-line/40 bg-app/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <BrandSwitcher brands={brands} activeId={activeId} />
      </div>

      <div className="flex items-center gap-3.5">
        {/* Barra de busca / filtro interativo */}
        <div className={`relative flex items-center transition-all duration-300 ${searchFocused ? 'w-64' : 'w-48'}`}>
          <Search className="absolute left-3 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar no hub..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface-2 border border-line/80 dark:border-line/40 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
          />
        </div>

        {/* Notificações pulsantes */}
        <button 
          type="button" 
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted transition-colors hover:bg-surface-2/80 hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent animate-pulse" />
        </button>

        <ThemeToggle />

        <div className="h-5 w-px bg-line/80 dark:bg-line/40" />

        <form action={signOut}>
          <button 
            type="submit" 
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Rodar testes unitários e build para checar compatibilidade do Topbar**

Execute:
```powershell
npm test && npm run build
```

Expected: Todos os 78 testes passando e compilação do Next.js 100% limpa.

- [ ] **Step 3: Comitar a reestilização do Topbar**

Execute:
```powershell
git add components/layout/Topbar.jsx
git commit -m "feat(ui): reestiliza Topbar com busca interativa e glassmorphism no padrão Sales-Ops"
```

---

### Task 4: Reestilização da Barra Lateral (`components/layout/Sidebar.jsx`)

**Files:**
- Modify: `components/layout/Sidebar.jsx`
- Test: Suíte regressiva global (`npm test`)

**Interfaces:**
- Consumes: `NAV_GROUPS`, `cn`.
- Produces: Sidebar com destaque ativo corporativo (`bg-accent/15 text-accent border-l-2 border-accent` em dark / `bg-accent text-white` em light).

- [ ] **Step 1: Atualizar `components/layout/Sidebar.jsx` para suportar indicador esmeralda elegante no modo escuro**

Substitua o conteúdo de `components/layout/Sidebar.jsx` pelo seguinte código completo:
```jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line/80 dark:border-line/40 bg-surface/60 backdrop-blur-md">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-line/40">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-soft text-white shadow-md shadow-accent/25">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <span className="text-sm font-extrabold tracking-tight text-ink font-theme">SocialHub</span>
      </div>

      <nav className="mt-4 flex-1 space-y-6 px-3.5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-faint">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.soon) {
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-faint">
                      <Icon className="h-4 w-4" />
                      {item.label}
                      <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 text-[9px] font-extrabold text-faint">breve</span>
                    </div>
                  );
                }
                const active = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200',
                      active 
                        ? 'bg-accent text-white shadow-md shadow-accent/20 dark:bg-accent/15 dark:text-accent dark:shadow-none dark:border-l-2 dark:border-accent dark:rounded-l-none' 
                        : 'text-muted hover:bg-surface-2 hover:text-ink'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 transition-colors', active ? 'text-white dark:text-accent' : 'text-faint group-hover:text-ink')} />
                    {item.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90 dark:bg-accent" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line/80 dark:border-line/40 px-5 py-3.5">
        <p className="text-[10px] font-semibold text-faint">SocialHub · v2.1 Pro</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Rodar testes e compilar para verificar a Sidebar**

Execute:
```powershell
npm test && npm run build
```

Expected: Todos os 78 testes passando e build limpo.

- [ ] **Step 3: Comitar a reestilização da Sidebar**

Execute:
```powershell
git add components/layout/Sidebar.jsx
git commit -m "feat(ui): reestiliza Sidebar com destaque ativo esmeralda/dark corporativo"
```

---

### Task 5: Reestilização dos Painéis de Gráfico e Vídeos (`FollowerTrend` & `YoutubePanel`)

**Files:**
- Modify: `components/dashboard/FollowerTrend.jsx`
- Modify: `components/dashboard/YoutubePanel.jsx`
- Test: Suíte regressiva global e build (`npm test && npm run build`)

**Interfaces:**
- Consumes: `TrendingUp`, `TrendingDown`, `Youtube`, `Clock`.
- Produces: Painéis de gráfico e vídeos com bordas precisas (`border-line/80 dark:border-line/40`), sombras `shadow-soft` e hover macio nas linhas de vídeo.

- [ ] **Step 1: Atualizar `components/dashboard/FollowerTrend.jsx` para visual glass limpo e barras com gradiente esmeralda no modo noturno**

Substitua o conteúdo de `components/dashboard/FollowerTrend.jsx` pelo seguinte código completo:
```jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

export function FollowerTrend({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-line/80 dark:border-line/40 bg-surface/60 p-6 text-xs text-muted">
        <p className="font-bold text-ink">Evolução de seguidores</p>
        <p className="mt-1">O gráfico aparece conforme os dias passam — um ponto por dia sincronizado com o Instagram.</p>
      </div>
    );
  }
  const values = data.map((d) => Number(d.followers) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const up = delta >= 0;

  return (
    <div className="rounded-2xl border border-line/80 dark:border-line/40 bg-surface p-6 shadow-soft">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Seguidores · evolução</p>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-success' : 'text-danger'}`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? '+' : ''}{delta}
        </span>
      </div>
      <div className="flex h-32 items-end gap-2 pt-4">
        {values.map((v, i) => {
          const h = max === min ? 60 : 12 + ((v - min) / (max - min)) * 88;
          return (
            <div key={i} className="group relative flex-1 h-full flex items-end">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-accent/25 to-accent transition-all duration-300 ease-emphasized group-hover:from-accent group-hover:to-accent-soft"
                style={{ height: `${h}%`, minHeight: 6 }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[11px] font-bold text-ink shadow-soft opacity-0 transition-opacity group-hover:opacity-100 tabular-nums z-10">
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `components/dashboard/YoutubePanel.jsx` para visualização tabular limpa no estilo Sales-Ops**

Substitua o conteúdo de `components/dashboard/YoutubePanel.jsx` pelo seguinte código completo:
```jsx
import { Youtube, Clock } from 'lucide-react';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function YoutubePanel({ account, history, videos, bestTimes }) {
  const top = bestTimes?.[0];
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FF0000]/15 text-[#FF0000]">
          <Youtube className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold text-ink tracking-tight font-theme">
          YouTube · @{account?.platform_username || 'canal'}
        </p>
      </div>

      {top && (
        <div className="flex items-center gap-2.5 rounded-xl border border-line/80 dark:border-line/40 bg-surface-2/70 p-4 text-xs">
          <Clock className="h-4 w-4 text-accent shrink-0" />
          <span className="text-ink">
            Melhor horário para postar: <strong className="font-mono">{WD[top.weekday]} {String(top.hour).padStart(2, '0')}h</strong>
          </span>
          <span className="ml-auto text-[11px] font-medium text-muted">
            {top.basis === 'channel' ? 'baseado no seu canal' : 'sugestão geral'}
          </span>
        </div>
      )}

      <FollowerTrend data={history} />

      {videos?.length > 0 && (
        <div className="rounded-2xl border border-line/80 dark:border-line/40 bg-surface p-5 shadow-soft">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Vídeos · desempenho recente
          </p>
          <ul className="divide-y divide-line/60 dark:divide-line/30">
            {videos.map((v) => (
              <li key={v.video_id} className="group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors duration-200">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink group-hover:text-accent transition-colors">
                  {v.title || v.video_id}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {fmt(v.views)} views
                </span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {Math.round(v.avg_view_pct)}% retenção
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Rodar a suíte completa de testes unitários e build de verificação final**

Execute:
```powershell
npm test && npm run build
```

Expected: Todos os 78 testes passando sem regredir e `npm run build` concluindo com sucesso em todas as rotas estáticas e dinâmicas do Next.js.

- [ ] **Step 4: Comitar a reestilização final dos painéis de dashboard**

Execute:
```powershell
git add components/dashboard/FollowerTrend.jsx components/dashboard/YoutubePanel.jsx
git commit -m "feat(ui): reestiliza FollowerTrend e YoutubePanel no padrão Sales-Ops"
```
