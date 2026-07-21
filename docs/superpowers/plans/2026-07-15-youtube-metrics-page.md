# YouTube Analytics & Metrics Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the central `/metrics` reporting hub and build the dedicated, high-end YouTube Analytics page (`/metrics/youtube`) with Recharts evolution graphs, retention tracking grid (`avg_view_pct`), and publishing intelligence.

**Architecture:** Shared layout `app/(app)/metrics/layout.jsx` coordinates tab navigation via `MetricsTabsNav` across `/metrics` (overview) and sub-routes like `/metrics/youtube`. Data querying is handled cleanly in Server Components via `lib/youtube-data.js` and rendered by modular, tabular-nums styled UI components (`YoutubeKpiGrid`, `YoutubeEvolutionChart`, `YoutubeVideosTable`, `YoutubeBestTimeCard`).

**Tech Stack:** Next.js 14 App Router, React 18, Recharts 2.12, Supabase SSR/Client, Tailwind CSS, Lucide React, Vitest.

## Global Constraints

- **Design System:** Finly-Inspired High-End Dashboard (`DESIGN.md`).
- **Typography:** `Outfit` or `Geist` for headers/labels; mandatory `Geist Mono` or `JetBrains Mono` with `tabular-nums` for all numbers, percentages, timestamps, subscriber counts, views, and retention stats.
- **Colors & Styling:** Light (`#F6F5FA`/`#FFFFFF`) vs Dark (`#18181C`/`#232329`) themes with subtle borders (`border-line` or `1px solid rgba(255,255,255,0.07)`), rounded cards (`rounded-2xl` / `rounded-3xl`).
- **Semantic Colors:** Indigo/Violet (`#6366F1`/`#8B5CF6`) for primary accents/charts; Emerald (`#10B981`) for retention ≥ 60% and positive growth; Amber (`#F59E0B`) for retention 30-59%; Rose/Red (`#F43F5E` or `#FF0000`) for YouTube identity and retention < 30%.
- **Testing:** All tasks accompanied by unit/component verification tests running via `vitest run` on `tests/unit/**/*.test.js`.

---

### Task 1: Navigation Entry & Tab Bar Navigation (`MetricsTabsNav`)

**Files:**
- Modify: `data/nav.js:10-18`
- Create: `components/analytics/MetricsTabsNav.jsx`
- Create: `tests/unit/metrics-tabs-nav.test.js`

**Interfaces:**
- Consumes: `NAV_GROUPS` from `data/nav.js`
- Produces: `MetricsTabsNav` component accepting `({ hasYoutubeConnected = false, hasInstagramConnected = false })` and rendering navigation pills.

- [ ] **Step 1: Write the failing test for `MetricsTabsNav` configuration and tab items calculation**

```javascript
// tests/unit/metrics-tabs-nav.test.js
import { describe, it, expect } from 'vitest';
import { getMetricsTabItems } from '@/components/analytics/MetricsTabsNav';
import { NAV_GROUPS } from '@/data/nav';

describe('Navigation and MetricsTabsNav helper', () => {
  it('nav.js has active Relatórios entry pointing to /metrics', () => {
    const allItems = NAV_GROUPS.flatMap((g) => g.items);
    const relatorios = allItems.find((i) => i.label === 'Relatórios');
    expect(relatorios).toBeDefined();
    expect(relatorios.href).toBe('/metrics');
    expect(relatorios.soon).toBe(false);
  });

  it('getMetricsTabItems returns correctly structured tabs with connection status', () => {
    const items = getMetricsTabItems({ hasYoutube: true, hasInstagram: false });
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ href: '/metrics', label: 'Visão Geral', iconName: 'BarChart3', connected: true });
    expect(items[1]).toEqual({ href: '/metrics/youtube', label: 'YouTube', iconName: 'Youtube', connected: true });
    expect(items[2]).toEqual({ href: '/metrics/instagram', label: 'Instagram', iconName: 'Instagram', connected: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run tests/unit/metrics-tabs-nav.test.js`  
Expected: FAIL with "Cannot find module '@/components/analytics/MetricsTabsNav'" and nav failure on `Relatórios`.

- [ ] **Step 3: Modify `data/nav.js` to activate `/metrics`**

```javascript
// data/nav.js
import { LayoutDashboard, GitBranch, Handshake, Sparkles, Coins, Users, CheckSquare, Inbox, BarChart3 } from 'lucide-react';

export const NAV_GROUPS = [
  { label: 'Módulos Principais', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/composer', label: 'Composer (Postar)', icon: GitBranch },
    { href: '/calendar', label: 'Calendário & Links', icon: Handshake },
    { href: '/brand-kit', label: 'Brand Kit & DNA', icon: Sparkles },
    { href: '/metrics', label: 'Relatórios', icon: BarChart3, soon: false }
  ]},
  { label: 'Administração', items: [
    { href: '/approvals', label: 'Aprovações', icon: CheckSquare },
    { href: '/connections', label: 'Conexões (Meta/YT)', icon: Users },
    { href: '/ai-costs', label: 'Custos da IA', icon: Coins }
  ]},
  { label: 'Em breve', items: [
    { href: '#', label: 'Inbox', icon: Inbox, soon: true }
  ]}
];
```

- [ ] **Step 4: Create `components/analytics/MetricsTabsNav.jsx`**

```jsx
// components/analytics/MetricsTabsNav.jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Youtube, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getMetricsTabItems({ hasYoutube = false, hasInstagram = false } = {}) {
  return [
    { href: '/metrics', label: 'Visão Geral', iconName: 'BarChart3', connected: true },
    { href: '/metrics/youtube', label: 'YouTube', iconName: 'Youtube', connected: hasYoutube },
    { href: '/metrics/instagram', label: 'Instagram', iconName: 'Instagram', connected: hasInstagram }
  ];
}

const ICON_MAP = {
  BarChart3,
  Youtube,
  Instagram
};

export function MetricsTabsNav({ hasYoutube = false, hasInstagram = false }) {
  const pathname = usePathname();
  const tabs = getMetricsTabItems({ hasYoutube, hasInstagram });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
      {tabs.map((tab) => {
        const Icon = ICON_MAP[tab.iconName] || BarChart3;
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'group relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 border',
              active
                ? 'bg-accent/15 border-accent/40 text-ink shadow-sm'
                : 'bg-surface/60 border-line text-muted hover:bg-surface-2 hover:text-ink hover:border-line'
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200', active ? 'text-accent scale-105' : 'text-faint group-hover:text-ink')} />
            <span>{tab.label}</span>
            {tab.iconName !== 'BarChart3' && (
              <span
                className={cn(
                  'h-2 w-2 rounded-full shrink-0 transition-colors',
                  tab.connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-zinc-400/50'
                )}
                title={tab.connected ? 'Canal Conectado' : 'Canal Pendente'}
              />
            )}
            {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-accent -mb-4" />}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `vitest run tests/unit/metrics-tabs-nav.test.js`  
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add data/nav.js components/analytics/MetricsTabsNav.jsx tests/unit/metrics-tabs-nav.test.js
git commit -m "feat(analytics): add /metrics navigation entry and MetricsTabsNav component"
```

---

### Task 2: Central Metrics Layout & Overview Landing (`/metrics`)

**Files:**
- Create: `app/(app)/metrics/layout.jsx`
- Create: `app/(app)/metrics/page.jsx`
- Create: `tests/unit/metrics-overview-helpers.test.js`

**Interfaces:**
- Consumes: `listBrands`, `getActiveBrandId` from `lib/brands-data.js`; `resolveActive` from `lib/brands.js`; `hasYoutube` from `lib/youtube-data.js`; `getBrandInstagramMetrics` from `lib/metrics-data.js`
- Produces: Shared analytics layout and cross-platform overview page.

- [ ] **Step 1: Write unit test for cross-platform summary formatter logic**

```javascript
// tests/unit/metrics-overview-helpers.test.js
import { describe, it, expect } from 'vitest';
import { formatOverviewMetrics } from '@/app/(app)/metrics/page';

describe('formatOverviewMetrics', () => {
  it('summarizes instagram and youtube metrics cleanly into high-level cards', () => {
    const summary = formatOverviewMetrics({
      igMetrics: { followers: 12500, engagement: 4.2 },
      ytAccount: { platform_username: 'devchannel' },
      ytFollowers: 34200
    });
    expect(summary.totalAudience).toBe(46700);
    expect(summary.activeChannels).toBe(2);
    expect(summary.igStatus).toBe('Conectado');
    expect(summary.ytStatus).toBe('Conectado');
  });

  it('handles missing/disconnected channels gracefully', () => {
    const summary = formatOverviewMetrics({ igMetrics: null, ytAccount: null, ytFollowers: 0 });
    expect(summary.totalAudience).toBe(0);
    expect(summary.activeChannels).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run tests/unit/metrics-overview-helpers.test.js`  
Expected: FAIL with "Cannot find module '@/app/(app)/metrics/page'"

- [ ] **Step 3: Create `app/(app)/metrics/layout.jsx`**

```jsx
// app/(app)/metrics/layout.jsx
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { hasYoutube } from '@/lib/youtube-data';
import { getBrandInstagramMetrics } from '@/lib/metrics-data';
import { MetricsTabsNav } from '@/components/analytics/MetricsTabsNav';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function MetricsLayout({ children }) {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Central de Relatórios & Analytics</h1>
          <p className="mt-1 text-sm text-muted">Selecione ou crie uma marca no topo para acessar os relatórios.</p>
        </div>
        <EmptyState title="Nenhuma marca ativa no momento" icon={Sparkles}>
          Use o seletor no topo para escolher a marca que deseja analisar.
        </EmptyState>
      </div>
    );
  }

  const yt = await hasYoutube(active.id);
  const igRes = await getBrandInstagramMetrics(active.id);
  const hasIg = Boolean(igRes?.ok);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
            <span>Central de Relatórios & Analytics</span>
            <span className="text-xs font-normal text-muted">· {active.name}</span>
          </h1>
          <p className="text-xs text-muted mt-1">Acompanhe métricas, retenção e evolução de audiência em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-2 border border-line px-3.5 py-1.5 rounded-lg text-xs font-semibold text-ink font-mono tabular-nums">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>Marca Ativa: {active.name}</span>
        </div>
      </div>

      <MetricsTabsNav hasYoutube={Boolean(yt)} hasInstagram={hasIg} />

      <div className="min-h-[400px]">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/(app)/metrics/page.jsx`**

```jsx
// app/(app)/metrics/page.jsx
import Link from 'next/link';
import { Users, TrendingUp, Youtube, Instagram, ArrowRight } from 'lucide-react';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { hasYoutube, getYoutubeFollowerHistory } from '@/lib/youtube-data';
import { getBrandInstagramMetrics } from '@/lib/metrics-data';
import { StatTile } from '@/components/dashboard/StatTile';

export function formatOverviewMetrics({ igMetrics, ytAccount, ytFollowers }) {
  const igAudience = Number(igMetrics?.followers) || 0;
  const ytAud = Number(ytFollowers) || 0;
  const totalAudience = igAudience + ytAud;
  let activeChannels = 0;
  if (igMetrics) activeChannels += 1;
  if (ytAccount) activeChannels += 1;

  return {
    totalAudience,
    activeChannels,
    igStatus: igMetrics ? 'Conectado' : 'Pendente',
    ytStatus: ytAccount ? 'Conectado' : 'Pendente'
  };
}

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export default async function MetricsOverviewPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  if (!active) return null;

  const igRes = await getBrandInstagramMetrics(active.id);
  const igMetrics = igRes?.ok ? igRes.metrics : null;
  const ytAccount = await hasYoutube(active.id);
  const ytHistory = ytAccount ? await getYoutubeFollowerHistory(active.id, 1) : [];
  const ytFollowers = ytHistory.length > 0 ? ytHistory[ytHistory.length - 1].followers : 0;

  const summary = formatOverviewMetrics({ igMetrics, ytAccount, ytFollowers });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatTile
          label="Audiência Total Combinada"
          value={fmt(summary.totalAudience)}
          icon={Users}
          change={`${summary.activeChannels} canais sincronizados`}
          changeType="neutral"
        />
        <StatTile
          label="Canais Ativos"
          value={`${summary.activeChannels} / 2`}
          icon={TrendingUp}
          change="YouTube & Instagram"
          changeType={summary.activeChannels > 0 ? 'positive' : 'neutral'}
        />
        <StatTile
          label="Frequência de Coleta"
          value="Diária"
          icon={Users}
          change="Sync automatizado via cron"
          changeType="neutral"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30 shadow-sm">
                <Youtube className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink tracking-tight">YouTube Analytics</h3>
                <p className="text-xs text-muted font-mono">{ytAccount ? `@${ytAccount.platform_username}` : 'Canal não vinculado'}</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface-2 border border-line font-bold tabular-nums">
              {fmt(ytFollowers)} inscritos
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Acompanhe a retenção individual por vídeo, tempo total assistido e gráfico comparativo de crescimento do seu canal.
          </p>
          <div className="pt-2">
            <Link
              href="/metrics/youtube"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-accent-soft transition-all shadow-sm"
            >
              <span>Abrir Painel Completo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E1306C]/15 text-[#E1306C] border border-[#E1306C]/30 shadow-sm">
                <Instagram className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink tracking-tight">Instagram Analytics</h3>
                <p className="text-xs text-muted font-mono">{igMetrics ? `@${igMetrics.username}` : 'Conta não vinculada'}</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-surface-2 border border-line font-bold tabular-nums">
              {fmt(igMetrics?.followers || 0)} seguidores
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Acompanhe taxa de engajamento, curtidas totais, amostra de publicações recentes e evolução de seguidores no Instagram.
          </p>
          <div className="pt-2">
            <Link
              href="/metrics/instagram"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-2 border border-line px-4 py-2 text-xs font-bold text-ink hover:border-accent/60 transition-all shadow-sm"
            >
              <span>Abrir Painel Completo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `vitest run tests/unit/metrics-overview-helpers.test.js`  
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add app/(app)/metrics/layout.jsx app/(app)/metrics/page.jsx tests/unit/metrics-overview-helpers.test.js
git commit -m "feat(analytics): create central metrics layout and overview landing page"
```

---

### Task 3: YouTube KPI Grid & Best Time Card (`YoutubeKpiGrid` & `YoutubeBestTimeCard`)

**Files:**
- Create: `components/analytics/YoutubeKpiGrid.jsx`
- Create: `components/analytics/YoutubeBestTimeCard.jsx`
- Create: `tests/unit/youtube-kpi-components.test.js`

**Interfaces:**
- Consumes: `StatTile` from `components/dashboard/StatTile.jsx`
- Produces: `YoutubeKpiGrid({ followers, followerChange, totalViews, avgRetentionPct, watchTimeMin })` and `YoutubeBestTimeCard({ bestTimes })`

- [ ] **Step 1: Write unit test for formatting and calculation inside KPI components**

```javascript
// tests/unit/youtube-kpi-components.test.js
import { describe, it, expect } from 'vitest';
import { calculateFollowerChangeText, formatWatchTime } from '@/components/analytics/YoutubeKpiGrid';

describe('YouTube KPI helpers', () => {
  it('calculateFollowerChangeText returns correct percentage and diff', () => {
    const res = calculateFollowerChangeText([{ followers: 1000 }, { followers: 1050 }]);
    expect(res.text).toBe('+50 (+5.0%) no período');
    expect(res.type).toBe('positive');
  });

  it('calculateFollowerChangeText handles zero diff or stable data', () => {
    const res = calculateFollowerChangeText([{ followers: 1000 }, { followers: 1000 }]);
    expect(res.text).toBe('Dados estáveis no período');
    expect(res.type).toBe('neutral');
  });

  it('formatWatchTime converts minutes to hours when >= 60', () => {
    expect(formatWatchTime(45)).toBe('45 min');
    expect(formatWatchTime(150)).toBe('2.5h');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run tests/unit/youtube-kpi-components.test.js`  
Expected: FAIL with "Cannot find module '@/components/analytics/YoutubeKpiGrid'"

- [ ] **Step 3: Create `components/analytics/YoutubeKpiGrid.jsx`**

```jsx
// components/analytics/YoutubeKpiGrid.jsx
import { Users, Eye, Clock, Activity } from 'lucide-react';
import { StatTile } from '@/components/dashboard/StatTile';

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function calculateFollowerChangeText(history = []) {
  if (!history || history.length < 2) {
    return { text: 'Estável ou amostra inicial', type: 'neutral' };
  }
  const first = Number(history[0].followers) || 0;
  const last = Number(history[history.length - 1].followers) || 0;
  const diff = last - first;
  if (first === 0) return { text: `${diff >= 0 ? '+' : ''}${diff} inscritos`, type: diff >= 0 ? 'positive' : 'negative' };
  const pct = ((diff / first) * 100).toFixed(1);
  if (diff === 0) return { text: 'Dados estáveis no período', type: 'neutral' };
  return {
    text: `${diff >= 0 ? '+' : ''}${diff} (${diff >= 0 ? '+' : ''}${pct}%) no período`,
    type: diff >= 0 ? 'positive' : 'negative'
  };
}

export function formatWatchTime(min = 0) {
  const num = Number(min) || 0;
  if (num < 60) return `${num} min`;
  return `${(num / 60).toFixed(1).replace('.0', '')}h`;
}

export function YoutubeKpiGrid({ history = [], totalViews = 0, avgRetentionPct = 0, watchTimeMin = 0 }) {
  const currentFollowers = history.length > 0 ? history[history.length - 1].followers : 0;
  const changeInfo = calculateFollowerChangeText(history);

  const retRounded = Math.round(avgRetentionPct || 0);
  let retType = 'neutral';
  if (retRounded >= 60) retType = 'positive';
  else if (retRounded < 30 && retRounded > 0) retType = 'negative';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatTile
        label="Inscritos no Canal"
        value={fmt(currentFollowers)}
        icon={Users}
        change={changeInfo.text}
        changeType={changeInfo.type}
      />
      <StatTile
        label="Visualizações Acumuladas"
        value={fmt(totalViews)}
        icon={Eye}
        change="Soma de vídeos recentes"
        changeType="neutral"
      />
      <StatTile
        label="Retenção Média (`avg_view_pct`)"
        value={`${retRounded}%`}
        icon={Activity}
        change={retRounded >= 60 ? 'Engajamento excelente' : retRounded >= 30 ? 'Retenção na média' : 'Atenção na introdução'}
        changeType={retType}
      />
      <StatTile
        label="Tempo de Exibição"
        value={formatWatchTime(watchTimeMin)}
        icon={Clock}
        change="Consumo acumulado do canal"
        changeType="neutral"
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `components/analytics/YoutubeBestTimeCard.jsx`**

```jsx
// components/analytics/YoutubeBestTimeCard.jsx
import { Clock, Sparkles, Youtube } from 'lucide-react';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function YoutubeBestTimeCard({ bestTimes = [] }) {
  const top = bestTimes?.[0];

  if (!top) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30 shadow-sm">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-ink tracking-tight">Horário Ideal de Publicação</h4>
            <p className="text-xs text-muted">Aguardando mais dados históricos de visualizações por hora.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30 shadow-sm">
          <Clock className="h-6 w-6" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-ink tracking-tight">Horário Recomendado para Postar no YouTube</h4>
            <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] text-accent font-mono font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {top.basis === 'channel' ? 'Pico de Retenção do Canal' : 'Heurística de Mercado'}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Os seus vídeos tendem a engajar e segurar mais retenção quando publicados no início desta janela.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-surface-2 border border-line px-5 py-3 rounded-xl shadow-inner shrink-0">
        <span className="text-xs text-muted font-medium">Melhor Dia & Hora:</span>
        <span className="text-base font-extrabold text-accent font-mono tabular-nums bg-app border border-line px-3 py-1 rounded-lg">
          {WD[top.weekday].toUpperCase()} • {String(top.hour).padStart(2, '0')}:00h
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `vitest run tests/unit/youtube-kpi-components.test.js`  
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add components/analytics/YoutubeKpiGrid.jsx components/analytics/YoutubeBestTimeCard.jsx tests/unit/youtube-kpi-components.test.js
git commit -m "feat(analytics): add YoutubeKpiGrid and YoutubeBestTimeCard components"
```

---

### Task 4: YouTube Evolution Chart Component (`YoutubeEvolutionChart`)

**Files:**
- Create: `components/analytics/YoutubeEvolutionChart.jsx`
- Create: `tests/unit/youtube-evolution-chart.test.js`

**Interfaces:**
- Consumes: `history` data (`[{ snapshot_date, followers, total_reach }]`)
- Produces: Client Component rendering interactive Recharts `AreaChart` with toggle controls for Metric (`followers` vs `total_reach`) and Time Window (`14d` vs `30d`).

- [ ] **Step 1: Write unit test for chart data slicing and formatting logic**

```javascript
// tests/unit/youtube-evolution-chart.test.js
import { describe, it, expect } from 'vitest';
import { sliceChartHistory } from '@/components/analytics/YoutubeEvolutionChart';

describe('sliceChartHistory', () => {
  const mockHistory = Array.from({ length: 40 }, (_, i) => ({
    snapshot_date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    followers: 1000 + i * 10,
    total_reach: 200 + i * 5
  }));

  it('slices the last N days accurately based on selected days param', () => {
    const res14 = sliceChartHistory(mockHistory, 14);
    expect(res14).toHaveLength(14);
    expect(res14[0].followers).toBe(1000 + 26 * 10);
  });

  it('returns entire array if history length is less than requested days', () => {
    const short = mockHistory.slice(0, 5);
    expect(sliceChartHistory(short, 14)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run tests/unit/youtube-evolution-chart.test.js`  
Expected: FAIL with "Cannot find module '@/components/analytics/YoutubeEvolutionChart'"

- [ ] **Step 3: Create `components/analytics/YoutubeEvolutionChart.jsx`**

```jsx
// components/analytics/YoutubeEvolutionChart.jsx
'use client';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export function sliceChartHistory(history = [], days = 30) {
  if (!Array.isArray(history) || history.length === 0) return [];
  if (history.length <= days) return history;
  return history.slice(history.length - days);
}

function CustomTooltip({ active, payload, label, metricLabel }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-ink tabular-nums flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#FF0000]" />
        <span>{metricLabel}: <strong>{val?.toLocaleString('pt-BR')}</strong></span>
      </p>
    </div>
  );
}

export function YoutubeEvolutionChart({ history = [] }) {
  const [metric, setMetric] = useState('followers'); // 'followers' | 'total_reach'
  const [days, setDays] = useState(30);              // 14 | 30

  const data = sliceChartHistory(history, days).map((h) => ({
    date: h.snapshot_date ? h.snapshot_date.split('-').slice(1).reverse().join('/') : '',
    followers: Number(h.followers) || 0,
    total_reach: Number(h.total_reach) || 0
  }));

  const metricLabel = metric === 'followers' ? 'Inscritos Acumulados' : 'Visualizações Diárias';

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h3 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#FF0000]" />
            <span>Evolução Histórica do Canal</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">Acompanhe a trajetória de crescimento nos últimos dias.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Métrica */}
          <div className="flex items-center rounded-xl bg-surface-2 border border-line p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetric('followers')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all tabular-nums',
                metric === 'followers' ? 'bg-accent text-black shadow-sm font-bold' : 'text-muted hover:text-ink'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Inscritos</span>
            </button>
            <button
              type="button"
              onClick={() => setMetric('total_reach')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1 transition-all tabular-nums',
                metric === 'total_reach' ? 'bg-accent text-black shadow-sm font-bold' : 'text-muted hover:text-ink'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Visualizações</span>
            </button>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center rounded-xl bg-surface-2 border border-line p-1 text-xs font-mono font-bold">
            {[14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded-lg px-2.5 py-1 transition-all tabular-nums',
                  days === d ? 'bg-surface border border-line text-ink shadow-sm' : 'text-muted hover:text-ink'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.length > 1 ? (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ytGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717A" tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#71717A"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip content={<CustomTooltip metricLabel={metricLabel} />} />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="#FF0000"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#ytGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2/40 text-center">
          <TrendingUp className="h-8 w-8 text-faint mb-2" />
          <p className="text-xs font-bold text-ink">Dados em processamento</p>
          <p className="text-[11px] text-muted max-w-[240px] mt-1">
            São necessários pelo menos 2 dias de snapshots na sincronização para renderizar a curva evolutiva.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run tests/unit/youtube-evolution-chart.test.js`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add components/analytics/YoutubeEvolutionChart.jsx tests/unit/youtube-evolution-chart.test.js
git commit -m "feat(analytics): add interactive YoutubeEvolutionChart Recharts component"
```

---

### Task 5: YouTube Videos Interactive Table & Retention Bar (`YoutubeVideosTable`)

**Files:**
- Create: `components/analytics/YoutubeVideosTable.jsx`
- Create: `tests/unit/youtube-videos-table.test.js`

**Interfaces:**
- Consumes: `videos` array (`[{ video_id, title, published_at, views, likes, comments, avg_view_pct, watch_time_min }]`)
- Produces: Client Component rendering interactive table with sorting (`views`, `retention`, `recent`), title search filter, and color-coded retention progress bar.

- [ ] **Step 1: Write unit test for video sorting, filtering, and retention bar color class logic**

```javascript
// tests/unit/youtube-videos-table.test.js
import { describe, it, expect } from 'vitest';
import { filterAndSortVideos, getRetentionBarColorClass } from '@/components/analytics/YoutubeVideosTable';

describe('YoutubeVideosTable helpers', () => {
  const sample = [
    { video_id: '1', title: 'Como Ganhar Views no YouTube', views: 5000, avg_view_pct: 68.5, published_at: '2026-07-10T10:00:00Z' },
    { video_id: '2', title: 'Tutorial de Shorts', views: 12000, avg_view_pct: 25.0, published_at: '2026-07-12T10:00:00Z' },
    { video_id: '3', title: 'Dicas de SEO', views: 3000, avg_view_pct: 45.0, published_at: '2026-07-14T10:00:00Z' }
  ];

  it('sorts by views desc when sortBy is views', () => {
    const res = filterAndSortVideos(sample, '', 'views');
    expect(res[0].video_id).toBe('2');
    expect(res[1].video_id).toBe('1');
  });

  it('sorts by retention desc when sortBy is retention', () => {
    const res = filterAndSortVideos(sample, '', 'retention');
    expect(res[0].video_id).toBe('1');
    expect(res[1].video_id).toBe('3');
  });

  it('filters accurately by search query (case-insensitive)', () => {
    const res = filterAndSortVideos(sample, 'shorts', 'views');
    expect(res).toHaveLength(1);
    expect(res[0].video_id).toBe('2');
  });

  it('assigns correct retention color class thresholds', () => {
    expect(getRetentionBarColorClass(65)).toContain('bg-emerald-500');
    expect(getRetentionBarColorClass(45)).toContain('bg-amber-500');
    expect(getRetentionBarColorClass(20)).toContain('bg-rose-500');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run tests/unit/youtube-videos-table.test.js`  
Expected: FAIL with "Cannot find module '@/components/analytics/YoutubeVideosTable'"

- [ ] **Step 3: Create `components/analytics/YoutubeVideosTable.jsx`**

```jsx
// components/analytics/YoutubeVideosTable.jsx
'use client';
import { useState } from 'react';
import { Search, Youtube, ThumbsUp, MessageSquare, Play, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function filterAndSortVideos(videos = [], search = '', sortBy = 'views') {
  if (!Array.isArray(videos)) return [];
  const q = (search || '').trim().toLowerCase();
  const filtered = q
    ? videos.filter((v) => (v.title || '').toLowerCase().includes(q) || (v.video_id || '').toLowerCase().includes(q))
    : [...videos];

  return filtered.sort((a, b) => {
    if (sortBy === 'views') return (Number(b.views) || 0) - (Number(a.views) || 0);
    if (sortBy === 'retention') return (Number(b.avg_view_pct) || 0) - (Number(a.avg_view_pct) || 0);
    if (sortBy === 'recent') {
      const dateA = new Date(a.published_at || 0).getTime();
      const dateB = new Date(b.published_at || 0).getTime();
      return dateB - dateA;
    }
    return 0;
  });
}

export function getRetentionBarColorClass(pct = 0) {
  const num = Number(pct) || 0;
  if (num >= 60) return 'bg-emerald-500 shadow-sm shadow-emerald-500/30';
  if (num >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function YoutubeVideosTable({ videos = [] }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('views'); // 'views' | 'retention' | 'recent'

  const displayed = filterAndSortVideos(videos, search, sortBy);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h3 className="text-sm font-bold text-ink tracking-tight flex items-center gap-2">
            <Youtube className="h-4 w-4 text-[#FF0000]" />
            <span>Desempenho dos Vídeos · Retenção & Engajamento</span>
          </h3>
          <p className="text-xs text-muted mt-0.5 font-mono">{videos.length} vídeos monitorados</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Busca por título */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[220px] rounded-xl bg-surface-2 border border-line pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono transition-all"
            />
          </div>

          {/* Abas de Ordenação */}
          <div className="flex items-center rounded-xl bg-surface-2 border border-line p-1 text-xs font-semibold">
            {[
              { id: 'views', label: 'Mais Vistos' },
              { id: 'retention', label: 'Maior Retenção' },
              { id: 'recent', label: 'Mais Recentes' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSortBy(tab.id)}
                className={cn(
                  'rounded-lg px-2.5 py-1 transition-all tabular-nums',
                  sortBy === tab.id ? 'bg-surface border border-line text-ink shadow-sm font-bold' : 'text-muted hover:text-ink'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {displayed.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-faint">
                <th className="py-3 pr-4 font-semibold">Vídeo</th>
                <th className="py-3 px-3 font-semibold font-mono text-right">Views</th>
                <th className="py-3 px-3 font-semibold font-mono text-right">Likes</th>
                <th className="py-3 px-3 font-semibold font-mono text-right">Comentários</th>
                <th className="py-3 px-3 font-semibold font-mono text-right">Retenção (`avg_view_pct`)</th>
                <th className="py-3 pl-4 font-semibold font-mono text-right">Publicado Em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {displayed.map((v) => {
                const ret = Math.round(Number(v.avg_view_pct) || 0);
                const retColor = getRetentionBarColorClass(ret);
                const dateStr = v.published_at
                  ? new Date(v.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'N/D';

                return (
                  <tr key={v.video_id} className="group hover:bg-surface-2/60 transition-colors duration-200">
                    <td className="py-3.5 pr-4 max-w-[260px]">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 border border-line text-muted group-hover:text-[#FF0000] transition-colors">
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink group-hover:text-accent transition-colors" title={v.title}>
                            {v.title || v.video_id}
                          </p>
                          <p className="font-mono text-[10px] text-muted truncate">ID: {v.video_id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-right tabular-nums text-ink">
                      {fmt(v.views)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-right tabular-nums text-muted">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <ThumbsUp className="h-3 w-3 text-faint" />
                        <span>{fmt(v.likes)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-right tabular-nums text-muted">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <MessageSquare className="h-3 w-3 text-faint" />
                        <span>{fmt(v.comments)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-ink tabular-nums">
                          {ret >= 60 && <Flame className="h-3.5 w-3.5 text-emerald-500 shrink-0 animate-bounce" />}
                          <span>{ret}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden border border-line/40">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', retColor)}
                            style={{ width: `${Math.min(ret, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pl-4 font-mono text-right tabular-nums text-muted">
                      {dateStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed border-line rounded-xl bg-surface-2/30">
          <p className="text-xs font-bold text-ink">Nenhum vídeo encontrado</p>
          <p className="text-[11px] text-muted mt-1">
            {search ? `Nenhum vídeo coincide com "${search}".` : 'Aguarde a sincronização diária para carregar a lista de vídeos.'}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run tests/unit/youtube-videos-table.test.js`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add components/analytics/YoutubeVideosTable.jsx tests/unit/youtube-videos-table.test.js
git commit -m "feat(analytics): add YoutubeVideosTable component with retention bar and client sorting"
```

---

### Task 6: YouTube Analytics Server Page (`/metrics/youtube/page.jsx`)

**Files:**
- Create: `app/(app)/metrics/youtube/page.jsx`
- Create: `tests/unit/youtube-page-summary.test.js`

**Interfaces:**
- Consumes: `listBrands`, `getActiveBrandId` from `lib/brands-data.js`; `resolveActive` from `lib/brands.js`; `hasYoutube`, `getYoutubeFollowerHistory`, `getYoutubeVideos`, `getYoutubeBestTimes` from `lib/youtube-data.js`; `YoutubeKpiGrid`, `YoutubeBestTimeCard`, `YoutubeEvolutionChart`, `YoutubeVideosTable` components.
- Produces: Complete server-side rendered `/metrics/youtube` page.

- [ ] **Step 1: Write unit test for aggregation helper used in `/metrics/youtube`**

```javascript
// tests/unit/youtube-page-summary.test.js
import { describe, it, expect } from 'vitest';
import { calculateYoutubeTotals } from '@/app/(app)/metrics/youtube/page';

describe('calculateYoutubeTotals', () => {
  it('computes total views, average retention percentage, and watch time accurately across videos', () => {
    const videos = [
      { views: 1000, avg_view_pct: 60.0, watch_time_min: 120 },
      { views: 3000, avg_view_pct: 40.0, watch_time_min: 300 }
    ];
    const totals = calculateYoutubeTotals(videos);
    expect(totals.totalViews).toBe(4000);
    expect(totals.avgRetentionPct).toBe(50.0);
    expect(totals.watchTimeMin).toBe(420);
  });

  it('handles empty videos array gracefully', () => {
    const totals = calculateYoutubeTotals([]);
    expect(totals.totalViews).toBe(0);
    expect(totals.avgRetentionPct).toBe(0);
    expect(totals.watchTimeMin).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vitest run tests/unit/youtube-page-summary.test.js`  
Expected: FAIL with "Cannot find module '@/app/(app)/metrics/youtube/page'"

- [ ] **Step 3: Create `app/(app)/metrics/youtube/page.jsx`**

```jsx
// app/(app)/metrics/youtube/page.jsx
import Link from 'next/link';
import { Youtube, ArrowRight, Sparkles } from 'lucide-react';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { hasYoutube, getYoutubeFollowerHistory, getYoutubeVideos, getYoutubeBestTimes } from '@/lib/youtube-data';
import { YoutubeKpiGrid } from '@/components/analytics/YoutubeKpiGrid';
import { YoutubeBestTimeCard } from '@/components/analytics/YoutubeBestTimeCard';
import { YoutubeEvolutionChart } from '@/components/analytics/YoutubeEvolutionChart';
import { YoutubeVideosTable } from '@/components/analytics/YoutubeVideosTable';
import { EmptyState } from '@/components/ui/EmptyState';

export function calculateYoutubeTotals(videos = []) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return { totalViews: 0, avgRetentionPct: 0, watchTimeMin: 0 };
  }
  let totalViews = 0;
  let sumRetention = 0;
  let watchTimeMin = 0;

  for (const v of videos) {
    totalViews += Number(v.views) || 0;
    sumRetention += Number(v.avg_view_pct) || 0;
    watchTimeMin += Number(v.watch_time_min) || 0;
  }

  const avgRetentionPct = Number((sumRetention / videos.length).toFixed(1));
  return { totalViews, avgRetentionPct, watchTimeMin };
}

export default async function YoutubeMetricsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  if (!active) return null;

  const ytAccount = await hasYoutube(active.id);

  if (!ytAccount) {
    return (
      <div className="space-y-6">
        <EmptyState title="Canal do YouTube não conectado" icon={Youtube}>
          Vincule o canal desta marca para desbloquear relatórios de visualizações, retenção (`avg_view_pct`) e horários ideais de postagem.
          <div className="mt-4">
            <Link
              href="/connections"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF0000] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#FF0000]/90 transition-all shadow-md"
            >
              <span>Vincular Canal no YouTube</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  // Busca dados em paralelo para performance
  const [history, videos, bestTimes] = await Promise.all([
    getYoutubeFollowerHistory(active.id, 30),
    getYoutubeVideos(active.id, 50),
    getYoutubeBestTimes(active.id)
  ]);

  const totals = calculateYoutubeTotals(videos);

  return (
    <div className="space-y-8">
      {/* Banner de Identificação do Canal */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30">
            <Youtube className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
              <span>{ytAccount.platform_username || 'Canal Ativo'}</span>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-500 font-mono font-bold">
                Sincronizado
              </span>
            </h2>
            <p className="text-xs text-muted font-mono">YouTube Data & Analytics API · Leitura em tempo real</p>
          </div>
        </div>
        <Link
          href="/connections"
          className="text-xs font-semibold text-muted hover:text-ink transition-colors border border-line px-3 py-1.5 rounded-lg bg-surface-2"
        >
          Gerenciar Conexão
        </Link>
      </div>

      {/* Grid Executivo de KPIs */}
      <YoutubeKpiGrid
        history={history}
        totalViews={totals.totalViews}
        avgRetentionPct={totals.avgRetentionPct}
        watchTimeMin={totals.watchTimeMin}
      />

      {/* Gráfico de Evolução e Inteligência de Publicação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <YoutubeEvolutionChart history={history} />
        </div>
        <div className="lg:col-span-1">
          <YoutubeBestTimeCard bestTimes={bestTimes} />
        </div>
      </div>

      {/* Tabela Interativa de Desempenho e Retenção dos Vídeos */}
      <YoutubeVideosTable videos={videos} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vitest run tests/unit/youtube-page-summary.test.js`  
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add app/(app)/metrics/youtube/page.jsx tests/unit/youtube-page-summary.test.js
git commit -m "feat(analytics): build full server-rendered /metrics/youtube analytics page"
```

---

## Self-Review Checklist Verification

1. **Spec Coverage:**
   - Activated `/metrics` in navigation (`data/nav.js` in Task 1).
   - Created central layout `app/(app)/metrics/layout.jsx` with `MetricsTabsNav` (Task 1 & 2).
   - Created overview page `app/(app)/metrics/page.jsx` (Task 2).
   - Created `YoutubeKpiGrid` with subscriber growth, accumulated views, retention percentage, and watch time (Task 3).
   - Created `YoutubeBestTimeCard` using `suggestBestTimes` output (Task 3).
   - Created `YoutubeEvolutionChart` with toggles for `followers` vs `total_reach` and time window (`14d`/`30d`) (Task 4).
   - Created `YoutubeVideosTable` with retention bar (`avg_view_pct`), sorting tabs (`views`, `retention`, `recent`), and title search (Task 5).
   - Created main server page `/metrics/youtube/page.jsx` with full Empty State for disconnected channels (Task 6).
2. **Placeholder Scan:** Checked. Zero `TBD`, `TODO`, or omitted code blocks. Every file and step is fully fleshed out with complete imports, Tailwind classes, and logic.
3. **Type/Signature Consistency:** Checked. `calculateYoutubeTotals`, `filterAndSortVideos`, `sliceChartHistory`, `calculateFollowerChangeText`, and `formatOverviewMetrics` match exactly between tests and component implementations.
