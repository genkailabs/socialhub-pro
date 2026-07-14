# Integração YouTube (métricas + horários) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Puxar métricas do YouTube (canal + por vídeo) para o dashboard e sugerir melhores horários de postagem, sem upload/publicação pela plataforma.

**Architecture:** Subsistema read-only. OAuth só leitura identifica o canal e guarda tokens. Cron diário lê Data API (uploads + inscritos) e Analytics API (desempenho), grava snapshots em `social_analytics_history` (canal) e `youtube_video_stats` (por vídeo). Módulo puro calcula horários. UI mostra tudo no dashboard.

**Tech Stack:** Next.js 14 (App Router), Supabase (postgres + service-role no cron), Vitest (unit), Google OAuth 2.0, YouTube Data API v3 + YouTube Analytics API v2.

**Spec:** `docs/superpowers/specs/2026-07-14-youtube-integration-design.md`

---

## Estrutura de arquivos

**Criar:**
- `supabase/migrations/20260714_youtube_video_stats.sql` — tabela por vídeo + RLS + índices.
- `lib/youtube/analytics.js` — parsers **puros** da resposta da Analytics API (testáveis).
- `lib/youtube/best-times.js` — cálculo **puro** de melhores horários (testável).
- `lib/youtube-data.js` — leitura para a UI (histórico de canal, stats de vídeo, sugestão).
- `app/api/cron/youtube-sync/route.js` — cron diário de sincronização.
- `components/dashboard/YoutubePanel.jsx` — cards de canal + vídeos + horário no dashboard.
- `tests/unit/youtube-analytics.test.js` — testa parsers.
- `tests/unit/youtube-best-times.test.js` — testa sugestão de horário.

**Modificar:**
- `lib/youtube/google.js` — trocar escopos, remover `uploadVideo`, adicionar `getChannelStats` / `listChannelVideos` / `getVideoStats`.
- `data/platforms.js:10-11` — `caps` do YouTube → análise; sem publicação.
- `app/(app)/dashboard/page.jsx` — renderizar `YoutubePanel` quando há token YouTube.
- `vercel.json` — agendar o cron `youtube-sync` (ou documentar se não existir).

---

## Task 1: Migração `youtube_video_stats`

**Files:**
- Create: `supabase/migrations/20260714_youtube_video_stats.sql`

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- =====================================================================
-- MIGRAÇÃO: MÉTRICAS POR VÍDEO DO YOUTUBE
-- Rodar no SQL Editor do projeto Supabase (mesmo padrão das outras migrações).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.youtube_video_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text,
  published_at timestamptz,
  snapshot_date date NOT NULL,
  views int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  avg_view_pct numeric DEFAULT 0,
  watch_time_min int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT youtube_video_stats_brand_video_date_key UNIQUE (brand_id, video_id, snapshot_date)
);

ALTER TABLE public.youtube_video_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dono da marca gerencia stats de vídeo" ON public.youtube_video_stats;
CREATE POLICY "Dono da marca gerencia stats de vídeo" ON public.youtube_video_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = youtube_video_stats.brand_id AND brands.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_yt_video_stats_brand ON public.youtube_video_stats (brand_id, video_id);
CREATE INDEX IF NOT EXISTS idx_yt_video_stats_date ON public.youtube_video_stats (snapshot_date DESC);
```

- [ ] **Step 2: Rodar a migração**

Abrir o SQL Editor do projeto Supabase (ref em `memory/supabase-account.md`), colar o conteúdo e executar. Confirmar que a tabela aparece em `public`.

Nota: o cron usa o client service-role (`createAdmin`), que ignora RLS. A policy protege leituras client-side pela UI.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260714_youtube_video_stats.sql
git commit -m "feat(youtube): migração youtube_video_stats (métrica por vídeo)"
```

---

## Task 2: Parsers puros da Analytics API

A YouTube Analytics API responde `{ columnHeaders: [{name}], rows: [[...]] }`. Parsers mapeiam header→valor, independentes de rede.

**Files:**
- Create: `lib/youtube/analytics.js`
- Test: `tests/unit/youtube-analytics.test.js`

- [ ] **Step 1: Escrever o teste falhando**

```javascript
import { describe, it, expect } from 'vitest';
import { parseReportRow, parseChannelReport, parseVideoReport } from '@/lib/youtube/analytics';

describe('parseReportRow', () => {
  it('mapeia columnHeaders para objeto por nome', () => {
    const json = {
      columnHeaders: [{ name: 'views' }, { name: 'likes' }],
      rows: [[100, 7]]
    };
    expect(parseReportRow(json)).toEqual({ views: 100, likes: 7 });
  });
  it('retorna objeto vazio quando não há linhas', () => {
    expect(parseReportRow({ columnHeaders: [{ name: 'views' }], rows: [] })).toEqual({});
    expect(parseReportRow({})).toEqual({});
  });
});

describe('parseChannelReport', () => {
  it('normaliza métricas de canal', () => {
    const json = {
      columnHeaders: [{ name: 'views' }, { name: 'estimatedMinutesWatched' }, { name: 'subscribersGained' }],
      rows: [[500, 1200, 15]]
    };
    expect(parseChannelReport(json)).toEqual({ views: 500, watchTimeMin: 1200, subscribersGained: 15 });
  });
  it('usa zero para métricas ausentes', () => {
    expect(parseChannelReport({ columnHeaders: [], rows: [] }))
      .toEqual({ views: 0, watchTimeMin: 0, subscribersGained: 0 });
  });
});

describe('parseVideoReport', () => {
  it('normaliza métricas de vídeo', () => {
    const json = {
      columnHeaders: [
        { name: 'views' }, { name: 'likes' }, { name: 'comments' },
        { name: 'averageViewPercentage' }, { name: 'estimatedMinutesWatched' }
      ],
      rows: [[300, 20, 4, 42.5, 90]]
    };
    expect(parseVideoReport(json)).toEqual({
      views: 300, likes: 20, comments: 4, avgViewPct: 42.5, watchTimeMin: 90
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `npx vitest run tests/unit/youtube-analytics.test.js`
Expected: FAIL — "Failed to resolve import '@/lib/youtube/analytics'".

- [ ] **Step 3: Implementar `lib/youtube/analytics.js`**

```javascript
// Transformações puras das respostas da YouTube Analytics API (v2/reports).
// Formato: { columnHeaders: [{ name }], rows: [[valores...]] }.

export function parseReportRow(json) {
  const headers = json?.columnHeaders || [];
  const row = json?.rows?.[0];
  if (!row) return {};
  const out = {};
  headers.forEach((h, i) => { out[h.name] = row[i]; });
  return out;
}

export function parseChannelReport(json) {
  const r = parseReportRow(json);
  return {
    views: Number(r.views) || 0,
    watchTimeMin: Number(r.estimatedMinutesWatched) || 0,
    subscribersGained: Number(r.subscribersGained) || 0
  };
}

export function parseVideoReport(json) {
  const r = parseReportRow(json);
  return {
    views: Number(r.views) || 0,
    likes: Number(r.likes) || 0,
    comments: Number(r.comments) || 0,
    avgViewPct: Number(r.averageViewPercentage) || 0,
    watchTimeMin: Number(r.estimatedMinutesWatched) || 0
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `npx vitest run tests/unit/youtube-analytics.test.js`
Expected: PASS (7 asserts).

- [ ] **Step 5: Commit**

```bash
git add lib/youtube/analytics.js tests/unit/youtube-analytics.test.js
git commit -m "feat(youtube): parsers puros da Analytics API + testes"
```

---

## Task 3: Módulo puro de melhores horários

Recebe `videoStats` (cada um com `published_at` ISO e `views`) e um offset de fuso; devolve horários rankeados. Sem histórico suficiente → heurística.

**Files:**
- Create: `lib/youtube/best-times.js`
- Test: `tests/unit/youtube-best-times.test.js`

- [ ] **Step 1: Escrever o teste falhando**

```javascript
import { describe, it, expect } from 'vitest';
import { suggestBestTimes, MIN_HISTORY } from '@/lib/youtube/best-times';

describe('suggestBestTimes — sem histórico', () => {
  it('usa heurística quando faltam vídeos', () => {
    const res = suggestBestTimes({ videoStats: [], tzOffsetHours: -3 });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.basis === 'heuristic')).toBe(true);
    expect(res[0]).toHaveProperty('weekday');
    expect(res[0]).toHaveProperty('hour');
  });
  it('ainda é heurística logo abaixo do limite', () => {
    const stats = Array.from({ length: MIN_HISTORY - 1 }, (_, i) => ({
      published_at: '2026-07-07T22:00:00.000Z', views: 10 + i   // ter 19h BR
    }));
    expect(suggestBestTimes({ videoStats: stats, tzOffsetHours: -3 })[0].basis).toBe('heuristic');
  });
});

describe('suggestBestTimes — com histórico', () => {
  it('rankeia a janela real de melhor desempenho', () => {
    // 5 vídeos: quinta 20h BR rende muito mais que segunda 8h BR.
    // 2026-07-09 é quinta; 23:00Z - 3h = 20h BR quinta (weekday 4).
    // 2026-07-06 é segunda; 11:00Z - 3h = 08h BR segunda (weekday 1).
    const stats = [
      { published_at: '2026-07-09T23:00:00.000Z', views: 900 },
      { published_at: '2026-07-16T23:00:00.000Z', views: 850 },
      { published_at: '2026-07-23T23:00:00.000Z', views: 800 },
      { published_at: '2026-07-06T11:00:00.000Z', views: 20 },
      { published_at: '2026-07-13T11:00:00.000Z', views: 15 }
    ];
    const res = suggestBestTimes({ videoStats: stats, tzOffsetHours: -3 });
    expect(res[0].basis).toBe('channel');
    expect(res[0].weekday).toBe(4);   // quinta
    expect(res[0].hour).toBe(20);     // 20h BR
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `npx vitest run tests/unit/youtube-best-times.test.js`
Expected: FAIL — "Failed to resolve import '@/lib/youtube/best-times'".

- [ ] **Step 3: Implementar `lib/youtube/best-times.js`**

```javascript
// Cálculo puro de melhores horários de postagem. Sem I/O.
// videoStats: [{ published_at: ISO string, views: number }]
// tzOffsetHours: deslocamento do fuso (BR = -3). weekday: 0=domingo.

export const MIN_HISTORY = 5;

// Janelas genéricas de bom engajamento no BR (fallback sem histórico).
const HEURISTIC = [
  { weekday: 2, hour: 19 }, // terça
  { weekday: 4, hour: 20 }, // quinta
  { weekday: 0, hour: 11 }  // domingo
];

function localParts(iso, tzOffsetHours) {
  const shifted = new Date(new Date(iso).getTime() + tzOffsetHours * 3600 * 1000);
  return { weekday: shifted.getUTCDay(), hour: shifted.getUTCHours() };
}

export function suggestBestTimes({ videoStats = [], tzOffsetHours = -3 } = {}) {
  const usable = videoStats.filter((v) => v.published_at);
  if (usable.length < MIN_HISTORY) {
    return HEURISTIC.map((h) => ({ ...h, score: 0, basis: 'heuristic' }));
  }

  // Agrupa por (weekday,hour), soma views, rankeia desc.
  const buckets = new Map();
  for (const v of usable) {
    const { weekday, hour } = localParts(v.published_at, tzOffsetHours);
    const key = `${weekday}-${hour}`;
    const cur = buckets.get(key) || { weekday, hour, score: 0 };
    cur.score += Number(v.views) || 0;
    buckets.set(key, cur);
  }
  return [...buckets.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((b) => ({ ...b, basis: 'channel' }));
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `npx vitest run tests/unit/youtube-best-times.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/youtube/best-times.js tests/unit/youtube-best-times.test.js
git commit -m "feat(youtube): módulo puro de sugestão de horário + testes"
```

---

## Task 4: `google.js` — escopos, remover upload, funções de leitura

**Files:**
- Modify: `lib/youtube/google.js`

- [ ] **Step 1: Trocar escopos e o comentário do topo**

Substituir linhas 1-6:

```javascript
// Google OAuth 2.0 + YouTube Data/Analytics API. App é read-only: lê canal e métricas.
// Escopos: leitura do canal/uploads + relatórios do YouTube Analytics.
export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly'
].join(' ');
```

- [ ] **Step 2: Trocar a constante `UPLOAD` pela base da Analytics API**

Substituir a linha 11 (`const UPLOAD = ...`) por:

```javascript
const ANALYTICS = 'https://youtubeanalytics.googleapis.com/v2/reports';
```

- [ ] **Step 3: Remover `uploadVideo` e adicionar as funções de leitura**

Apagar toda a função `uploadVideo` (linhas 67-97) e, no lugar, adicionar:

```javascript
import { parseChannelReport, parseVideoReport } from '@/lib/youtube/analytics';

// Lista os uploads do canal (id, título, data de publicação real).
export async function listChannelVideos(accessToken, max = 25) {
  const chUrl = `${API}/channels?part=contentDetails&mine=true`;
  const chData = await (await fetch(chUrl, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (chData.error) throw new Error(chData.error.message || 'Erro ao ler canal.');
  const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];
  const plUrl = `${API}/playlistItems?part=snippet,contentDetails&maxResults=${max}&playlistId=${uploads}`;
  const plData = await (await fetch(plUrl, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (plData.error) throw new Error(plData.error.message || 'Erro ao listar vídeos.');
  return (plData.items || []).map((it) => ({
    videoId: it.contentDetails?.videoId,
    title: it.snippet?.title || '',
    publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || null
  })).filter((v) => v.videoId);
}

// Agregado do canal para uma data (Analytics API). date = 'YYYY-MM-DD'.
export async function getChannelStats(accessToken, date) {
  const p = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: date, endDate: date,
    metrics: 'views,estimatedMinutesWatched,subscribersGained'
  });
  const data = await (await fetch(`${ANALYTICS}?${p}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) throw new Error(data.error.message || 'Erro no Analytics do canal.');
  return parseChannelReport(data);
}

// Métricas acumuladas de um vídeo entre startDate e endDate.
export async function getVideoStats(accessToken, videoId, startDate, endDate) {
  const p = new URLSearchParams({
    ids: 'channel==MINE',
    startDate, endDate,
    metrics: 'views,likes,comments,averageViewPercentage,estimatedMinutesWatched',
    filters: `video==${videoId}`
  });
  const data = await (await fetch(`${ANALYTICS}?${p}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) throw new Error(data.error.message || 'Erro no Analytics do vídeo.');
  return parseVideoReport(data);
}
```

- [ ] **Step 4: Verificar que nada mais importa `uploadVideo`**

Run: `npx grep -rn "uploadVideo" app lib` (ou usar a busca do editor).
Expected: nenhum resultado. Se houver, remover a referência.

- [ ] **Step 5: Rodar toda a suíte para garantir que nada quebrou**

Run: `npx vitest run`
Expected: PASS (incluindo os testes das Tasks 2 e 3).

- [ ] **Step 6: Commit**

```bash
git add lib/youtube/google.js
git commit -m "feat(youtube): escopos read-only + funções de leitura de métricas; remove uploadVideo"
```

---

## Task 5: Cron diário de sincronização

**Files:**
- Create: `app/api/cron/youtube-sync/route.js`

- [ ] **Step 1: Implementar a rota**

```javascript
import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { refreshAccessToken, getChannel, getChannelStats, listChannelVideos, getVideoStats } from '@/lib/youtube/google';

export const maxDuration = 60;

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Integração YouTube não configurada.' }, { status: 500 });
  }

  const admin = createAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tokens, error } = await admin
    .from('social_tokens')
    .select('brand_id, platform_data')
    .eq('platform', 'youtube')
    .eq('is_active', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const tok of tokens || []) {
    const started = Date.now();
    const refreshToken = tok.platform_data?.refresh_token;
    if (!refreshToken) { results.push({ brand_id: tok.brand_id, status: 'error', reason: 'sem refresh_token' }); continue; }

    try {
      const fresh = await refreshAccessToken({ refreshToken, clientId, clientSecret });
      const accessToken = fresh.access_token;

      // 1) Canal → social_analytics_history
      const channel = await getChannel(accessToken);
      const chStats = await getChannelStats(accessToken, today);
      const followers = await channelFollowers(accessToken); // ver helper abaixo
      await admin.from('social_analytics_history').upsert({
        brand_id: tok.brand_id,
        platform: 'youtube',
        snapshot_date: today,
        followers,
        total_reach: chStats.views
      }, { onConflict: 'brand_id,platform,snapshot_date' });

      // 2) Vídeos → youtube_video_stats
      const videos = await listChannelVideos(accessToken, 25);
      const start = firstDate(videos);
      for (const v of videos) {
        const vs = await getVideoStats(accessToken, v.videoId, start, today);
        await admin.from('youtube_video_stats').upsert({
          brand_id: tok.brand_id,
          video_id: v.videoId,
          title: v.title,
          published_at: v.publishedAt,
          snapshot_date: today,
          views: vs.views,
          likes: vs.likes,
          comments: vs.comments,
          avg_view_pct: vs.avgViewPct,
          watch_time_min: vs.watchTimeMin
        }, { onConflict: 'brand_id,video_id,snapshot_date' });
      }

      await admin.from('social_sync_logs').insert({
        brand_id: tok.brand_id, platform: 'youtube', status: 'success', duration_ms: Date.now() - started
      });
      results.push({ brand_id: tok.brand_id, status: 'success', channel: channel.title, videos: videos.length });
    } catch (e) {
      await admin.from('social_sync_logs').insert({
        brand_id: tok.brand_id, platform: 'youtube', status: 'error',
        error_message: e.message, duration_ms: Date.now() - started
      });
      results.push({ brand_id: tok.brand_id, status: 'error', reason: e.message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

// Total de inscritos via Data API (statistics).
async function channelFollowers(accessToken) {
  const url = 'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true';
  const data = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) return 0;
  return Number(data.items?.[0]?.statistics?.subscriberCount) || 0;
}

// Data de publicação mais antiga entre os vídeos (limite inferior da janela do Analytics).
function firstDate(videos) {
  const dates = videos.map((v) => v.publishedAt).filter(Boolean).sort();
  return (dates[0] || new Date().toISOString()).slice(0, 10);
}
```

- [ ] **Step 2: Verificação manual (smoke) local**

Com `.env` preenchido e ao menos uma marca com YouTube conectado, rodar o dev server (`npm run dev`) e chamar:

Run: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/youtube-sync`
Expected: JSON `{ ok: true, processed: N, results: [...] }`; conferir linhas novas em `youtube_video_stats` e `social_analytics_history` no Supabase.

Se não houver marca conectada ainda, esperado `{ ok: true, processed: 0, results: [] }`.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/youtube-sync/route.js
git commit -m "feat(youtube): cron diário de sync (canal + por vídeo)"
```

---

## Task 6: Leitura para a UI (`lib/youtube-data.js`)

**Files:**
- Create: `lib/youtube-data.js`

- [ ] **Step 1: Implementar os leitores**

```javascript
import { createClient } from '@/lib/supabase/server';
import { suggestBestTimes } from '@/lib/youtube/best-times';

// Existe token YouTube ativo para a marca?
export async function hasYoutube(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_tokens')
    .select('platform_username, platform_data')
    .eq('brand_id', brandId).eq('platform', 'youtube').eq('is_active', true)
    .maybeSingle();
  return data || null;
}

// Histórico de inscritos no formato que o FollowerTrend espera ({ snapshot_date, followers }).
export async function getYoutubeFollowerHistory(brandId, days = 14) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_analytics_history')
    .select('snapshot_date, followers')
    .eq('brand_id', brandId).eq('platform', 'youtube')
    .order('snapshot_date', { ascending: true })
    .limit(days);
  return data || [];
}

// Último snapshot de cada vídeo (mais recente primeiro).
export async function getYoutubeVideos(brandId, limit = 12) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_video_stats')
    .select('video_id, title, published_at, views, likes, comments, avg_view_pct, snapshot_date')
    .eq('brand_id', brandId)
    .order('snapshot_date', { ascending: false })
    .order('views', { ascending: false })
    .limit(200);
  // Deduplica por video_id mantendo o snapshot mais recente.
  const seen = new Map();
  for (const row of data || []) if (!seen.has(row.video_id)) seen.set(row.video_id, row);
  return [...seen.values()].slice(0, limit);
}

// Sugestão de melhor horário a partir do histórico de vídeos.
export async function getYoutubeBestTimes(brandId) {
  const videos = await getYoutubeVideos(brandId, 200);
  return suggestBestTimes({
    videoStats: videos.map((v) => ({ published_at: v.published_at, views: v.views })),
    tzOffsetHours: -3
  });
}
```

- [ ] **Step 2: Verificar import/tipos**

Confirmar que `suggestBestTimes` recebe `{ published_at, views }` (bate com Task 3) e que `getYoutubeFollowerHistory` devolve `{ snapshot_date, followers }` (bate com `FollowerTrend`).

- [ ] **Step 3: Commit**

```bash
git add lib/youtube-data.js
git commit -m "feat(youtube): leitores de métricas e horários para a UI"
```

---

## Task 7: Painel do YouTube no dashboard

**Files:**
- Create: `components/dashboard/YoutubePanel.jsx`
- Modify: `app/(app)/dashboard/page.jsx`

- [ ] **Step 1: Criar `YoutubePanel.jsx`**

```jsx
import { Youtube, Clock } from 'lucide-react';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function YoutubePanel({ account, history, videos, bestTimes }) {
  const top = bestTimes?.[0];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Youtube className="h-4 w-4 text-[#FF0000]" />
        <p className="text-sm font-extrabold text-ink">YouTube · @{account?.platform_username || 'canal'}</p>
      </div>

      {top && (
        <div className="glass flex items-center gap-2 rounded-2xl p-4 text-sm">
          <Clock className="h-4 w-4 text-accent" />
          <span className="text-ink">
            Melhor horário para postar: <strong>{WD[top.weekday]} {String(top.hour).padStart(2, '0')}h</strong>
          </span>
          <span className="ml-auto text-[11px] text-muted">
            {top.basis === 'channel' ? 'baseado no seu canal' : 'sugestão geral'}
          </span>
        </div>
      )}

      <FollowerTrend data={history} />

      {videos?.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Vídeos · desempenho</p>
          <ul className="divide-y divide-line">
            {videos.map((v) => (
              <li key={v.video_id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{v.title || v.video_id}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">{fmt(v.views)} views</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">{Math.round(v.avg_view_pct)}% retenção</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Ligar o painel no dashboard**

Em `app/(app)/dashboard/page.jsx`, adicionar aos imports (perto da linha 11):

```javascript
import { YoutubePanel } from '@/components/dashboard/YoutubePanel';
import { hasYoutube, getYoutubeFollowerHistory, getYoutubeVideos, getYoutubeBestTimes } from '@/lib/youtube-data';
```

Depois da linha 38 (`const pipeline = await getPipeline(active.id);`), adicionar:

```javascript
  const yt = await hasYoutube(active.id);
  const ytData = yt ? {
    account: yt,
    history: await getYoutubeFollowerHistory(active.id),
    videos: await getYoutubeVideos(active.id),
    bestTimes: await getYoutubeBestTimes(active.id)
  } : null;
```

E, dentro do JSX de retorno, logo após o bloco `<FollowerTrend data={history} />` fechar (o `</>` da condição `result?.ok`), inserir antes do fechamento do container principal:

```jsx
      {ytData && (
        <YoutubePanel
          account={ytData.account}
          history={ytData.history}
          videos={ytData.videos}
          bestTimes={ytData.bestTimes}
        />
      )}
```

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: build sem erros de import/JSX. (Painel só aparece com YouTube conectado; sem token, `ytData` é null e nada muda no dashboard.)

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/YoutubePanel.jsx "app/(app)/dashboard/page.jsx"
git commit -m "feat(youtube): painel de métricas e horário no dashboard"
```

---

## Task 8: Card de Conexões — caps de análise + aviso de reconexão

**Files:**
- Modify: `data/platforms.js:10-11`
- Test: `tests/unit/platforms.test.js` (ajustar se testar caps do YouTube)

- [ ] **Step 1: Trocar as caps do YouTube**

Em `data/platforms.js`, na entrada `youtube` (linhas 10-11), trocar:

```javascript
    caps: ['Vídeos', 'Shorts'], integrated: true, connectPath: '/api/youtube/oauth' },
```

por:

```javascript
    caps: ['Métricas', 'Analytics', 'Horários'], integrated: true, connectPath: '/api/youtube/oauth' },
```

- [ ] **Step 2: Rodar os testes de platforms para pegar regressão**

Run: `npx vitest run tests/unit/platforms.test.js`
Expected: PASS. Se algum teste fixar `['Vídeos','Shorts']`, atualizar o esperado para as novas caps.

- [ ] **Step 3: Commit**

```bash
git add data/platforms.js tests/unit/platforms.test.js
git commit -m "feat(youtube): caps do card de conexão viram métricas/analytics"
```

Nota sobre reconexão: usuários conectados no escopo antigo (`youtube.upload`) precisam clicar "Reconectar" no card (o botão já existe em `PlatformCard.jsx:83-89`) para conceder `yt-analytics.readonly`. O `prompt: 'consent'` em `buildAuthUrl` já força a nova tela de permissão. Sem trabalho extra de UI no MVP.

---

## Task 9: Agendar o cron no Vercel

**Files:**
- Modify/Create: `vercel.json`

- [ ] **Step 1: Verificar se `vercel.json` já existe e como o publish-due é agendado**

Run: `npx grep -n "crons" vercel.json` (ou abrir o arquivo).

- [ ] **Step 2: Adicionar a entrada do cron diário**

Se `vercel.json` existe com bloco `crons`, adicionar ao array:

```json
{ "path": "/api/cron/youtube-sync", "schedule": "0 6 * * *" }
```

Se não existir, criar `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/youtube-sync", "schedule": "0 6 * * *" }
  ]
}
```

(06:00 UTC ≈ 03:00 BR — janela de baixo tráfego. Ajustável.)

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore(youtube): agenda cron diário de sync no Vercel"
```

---

## Notas finais de execução

- **Env necessárias:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`. Confirmar no `.env` antes da Task 5.
- **Ordem:** Tasks 1→9 são incrementais. Tasks 2 e 3 (puras, TDD) podem ser feitas em paralelo. Task 7 depende de 6; Task 6 depende de 3.
- **Migração (Task 1)** roda à mão no Supabase — não há runner automático neste projeto (ver `memory/brand-onboarding-migration.md`).
