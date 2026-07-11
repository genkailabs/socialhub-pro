# M3b — Métricas reais + endpoints sync/publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** Dashboard exibe métricas **reais** do Instagram (seguidores, engajamento, posts, curtidas) via Graph API — fim do empty state para marca conectada. Portar endpoints `sync` (refresh) e `publish` (pronto p/ M4), sem service role, sem fallback entre marcas, sem número inventado.

**Architecture:** Server Component (dashboard) chama `getBrandInstagramMetrics(brandId)` que lê o token via client cookies (RLS), busca perfil+mídia na Graph API (fetch com `revalidate` de 10 min p/ não estourar rate limit) e calcula engajamento com função pura testada. Snapshot diário best-effort em `social_analytics_history`. Endpoints `/api/social/sync` e `/api/social/publish` reusam a mesma lib, com verificação de posse.

**Tech Stack:** Next.js Route Handlers + Server Components, Graph API v21.0, Vitest.

**Spec:** §5/§4. Depende de M3a (IG conectado). Verificável ao vivo (marca GenkaiLabs já conectada).

---

## Estrutura (resultado)

```
lib/meta/graph.js               # +fetchInstagramProfile, +fetchInstagramMedia
lib/meta/metrics.js             # computeEngagement (puro) + summarizeMedia (puro)
lib/metrics-data.js             # getBrandInstagramMetrics(brandId) [server, RLS, cache]
app/(app)/dashboard/page.jsx    # (reescrito) stat tiles reais ou empty state
components/dashboard/StatTile.jsx
app/api/social/sync/route.js    # refresh programático (posse)
app/api/social/publish/route.js # publish IG (posse) — pronto p/ M4
tests/unit/metrics.test.js      # TDD dos puros
```

---

## Task 1: `lib/meta/metrics.js` — cálculo puro (TDD)

**Files:** Create `lib/meta/metrics.js`, `tests/unit/metrics.test.js`

- [ ] **Step 1: Teste que falha**

```js
import { describe, it, expect } from 'vitest';
import { computeEngagement, summarizeMedia } from '@/lib/meta/metrics';

describe('summarizeMedia', () => {
  it('soma likes e comentários e conta itens', () => {
    const media = [
      { like_count: 10, comments_count: 2 },
      { like_count: 5, comments_count: 3 }
    ];
    expect(summarizeMedia(media)).toEqual({ totalLikes: 15, totalComments: 5, count: 2 });
  });
  it('lida com lista vazia', () => {
    expect(summarizeMedia([])).toEqual({ totalLikes: 0, totalComments: 0, count: 0 });
  });
});

describe('computeEngagement', () => {
  it('calcula % média por post sobre seguidores', () => {
    // (15+5)/2 = 10 interações médias; 10/200 = 5%
    expect(computeEngagement({ followers: 200, totalLikes: 15, totalComments: 5, count: 2 })).toBe('5.0%');
  });
  it('retorna 0.0% quando sem seguidores ou sem posts', () => {
    expect(computeEngagement({ followers: 0, totalLikes: 1, totalComments: 1, count: 1 })).toBe('0.0%');
    expect(computeEngagement({ followers: 100, totalLikes: 0, totalComments: 0, count: 0 })).toBe('0.0%');
  });
});
```

- [ ] **Step 2: Rodar → falha.** `npx vitest run tests/unit/metrics.test.js`

- [ ] **Step 3: Implementar `lib/meta/metrics.js`**

```js
export function summarizeMedia(media = []) {
  return media.reduce(
    (acc, m) => ({
      totalLikes: acc.totalLikes + (m.like_count || 0),
      totalComments: acc.totalComments + (m.comments_count || 0),
      count: acc.count + 1
    }),
    { totalLikes: 0, totalComments: 0, count: 0 }
  );
}

export function computeEngagement({ followers, totalLikes, totalComments, count }) {
  if (!followers || !count) return '0.0%';
  const avgInteractions = (totalLikes + totalComments) / count;
  return ((avgInteractions / followers) * 100).toFixed(1) + '%';
}
```

- [ ] **Step 4: Rodar → passa.**

- [ ] **Step 5: Commit** `git add lib/meta/metrics.js tests/unit/metrics.test.js && git commit -m "feat(m3b): calculo de engajamento puro (TDD)"`

---

## Task 2: Graph API — perfil e mídia

**Files:** Modify `lib/meta/graph.js` (append)

- [ ] **Step 1: Adicionar ao final de `lib/meta/graph.js`**

```js
// Métricas: cache de 10 min para não estourar rate limit da Graph API.
const METRICS_CACHE = { next: { revalidate: 600 } };

export async function fetchInstagramProfile(igId, token) {
  const url = `${GRAPH}/${igId}?fields=followers_count,media_count,name,username,profile_picture_url,biography&access_token=${token}`;
  const data = await (await fetch(url, METRICS_CACHE)).json();
  if (data.error) throw new Error(`Graph API (perfil): ${data.error.message}`);
  return data;
}

export async function fetchInstagramMedia(igId, token, limit = 15) {
  const url = `${GRAPH}/${igId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${token}`;
  const data = await (await fetch(url, METRICS_CACHE)).json();
  if (data.error) throw new Error(`Graph API (mídia): ${data.error.message}`);
  return data.data || [];
}
```

- [ ] **Step 2: Build.** `npm run build` → compila.

- [ ] **Step 3: Commit** `git add lib/meta/graph.js && git commit -m "feat(m3b): Graph API perfil+midia do Instagram"`

---

## Task 3: `lib/metrics-data.js` — métricas por marca (server, RLS)

**Files:** Create `lib/metrics-data.js`

- [ ] **Step 1: Implementar**

```js
import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfile, fetchInstagramMedia } from '@/lib/meta/graph';
import { summarizeMedia, computeEngagement } from '@/lib/meta/metrics';

// Lê o token do IG da marca (RLS garante posse) e retorna métricas reais, ou null.
export async function getBrandInstagramMetrics(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id, platform_username, platform_data')
    .eq('brand_id', brandId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();

  if (!token) return null;

  try {
    const profile = await fetchInstagramProfile(token.platform_user_id, token.access_token);
    const media = await fetchInstagramMedia(token.platform_user_id, token.access_token);
    const summary = summarizeMedia(media);
    const followers = profile.followers_count || 0;

    const metrics = {
      username: profile.username || token.platform_username,
      profilePicture: profile.profile_picture_url || token.platform_data?.profile_picture_url || null,
      followers,
      mediaCount: profile.media_count || 0,
      engagement: computeEngagement({ followers, ...summary }),
      totalLikes: summary.totalLikes,
      totalComments: summary.totalComments,
      sample: summary.count
    };

    // Snapshot diário best-effort (histórico real; não bloqueia render)
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('social_analytics_history').upsert({
      brand_id: brandId,
      platform: 'instagram',
      snapshot_date: today,
      followers,
      engagement_rate: metrics.engagement,
      total_reach: 0
    }, { onConflict: 'brand_id,platform,snapshot_date' }).then(() => {}, () => {});

    return { ok: true, metrics };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
```

- [ ] **Step 2: Commit** `git add lib/metrics-data.js && git commit -m "feat(m3b): getBrandInstagramMetrics (RLS + Graph + snapshot)"`

---

## Task 4: Dashboard com métricas reais

**Files:** Create `components/dashboard/StatTile.jsx`; Modify `app/(app)/dashboard/page.jsx`

- [ ] **Step 1: `components/dashboard/StatTile.jsx`**

```jsx
export function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Reescrever `app/(app)/dashboard/page.jsx`**

```jsx
import { EmptyState } from '@/components/ui/EmptyState';
import { StatTile } from '@/components/dashboard/StatTile';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandInstagramMetrics } from '@/lib/metrics-data';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export default async function DashboardPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());

  if (!active) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-extrabold">Dashboard</h1>
          <p className="text-xs text-muted">Comece criando sua primeira marca.</p>
        </div>
        <EmptyState title="Nenhuma marca ainda">
          Use o seletor no topo (“Nova marca”) para criar sua primeira marca.
        </EmptyState>
      </div>
    );
  }

  const result = await getBrandInstagramMetrics(active.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Olá, {active.name}</h1>
        <p className="text-xs text-muted">
          {result?.ok ? <>Instagram @{result.metrics.username} · dados reais da Graph API</> : 'Métricas reais aparecem após conectar o Instagram desta marca.'}
        </p>
      </div>

      {result?.ok ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Seguidores" value={fmt(result.metrics.followers)} />
          <StatTile label="Engajamento" value={result.metrics.engagement} hint={`amostra: ${result.metrics.sample} posts`} />
          <StatTile label="Posts" value={fmt(result.metrics.mediaCount)} />
          <StatTile label="Curtidas (amostra)" value={fmt(result.metrics.totalLikes)} hint={`${result.metrics.totalComments} comentários`} />
        </div>
      ) : result?.error ? (
        <EmptyState title="Não deu para atualizar agora">
          A Graph API retornou: {result.error}. Tente novamente em instantes ou reconecte o Instagram em Conexões.
        </EmptyState>
      ) : (
        <EmptyState title="Sem dados ainda">
          Conecte o Instagram desta marca na aba <strong>Conexões</strong> para ver seguidores, engajamento e posts reais. Nada aqui é simulado.
        </EmptyState>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

`npm run build` → compila.
`git add components/dashboard/StatTile.jsx "app/(app)/dashboard/page.jsx" && git commit -m "feat(m3b): dashboard com metricas reais do Instagram"`

---

## Task 5: Endpoints `sync` e `publish` (posse, sem mock)

**Files:** Create `app/api/social/sync/route.js`, `app/api/social/publish/route.js`

- [ ] **Step 1: `app/api/social/sync/route.js`**

```js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBrandInstagramMetrics } from '@/lib/metrics-data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brand_id');
  if (!brandId) return NextResponse.json({ success: false, error: 'brand_id obrigatório' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return NextResponse.json({ success: false, error: 'Marca inválida' }, { status: 403 });

  const result = await getBrandInstagramMetrics(brandId);
  if (!result) return NextResponse.json({ success: true, connected: false, networks: {} });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  return NextResponse.json({ success: true, connected: true, networks: { instagram: result.metrics } });
}
```

- [ ] **Step 2: `app/api/social/publish/route.js`** (pronto p/ M4; publica no IG da marca)

```js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage } from '@/lib/meta/graph';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { brand_id, caption, image_url } = body;
  if (!brand_id) return NextResponse.json({ success: false, error: 'brand_id obrigatório' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id, brand_id, brands!inner(user_id)')
    .eq('brand_id', brand_id)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();

  if (!token) return NextResponse.json({ success: false, error: 'Instagram não conectado para esta marca.' }, { status: 400 });
  if (!image_url) return NextResponse.json({ success: false, error: 'image_url obrigatório (Instagram exige mídia).' }, { status: 400 });

  try {
    const id = await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: caption || '', imageUrl: image_url });
    return NextResponse.json({ success: true, id, published_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 });
  }
}
```

- [ ] **Step 3: Adicionar `publishInstagramImage` ao final de `lib/meta/graph.js`** (portado de `legacy/api/social/publish.js`: container → poll → publish)

```js
export async function publishInstagramImage({ igId, token, caption, imageUrl }) {
  // 1. cria container
  const createUrl = `${GRAPH}/${igId}/media?${new URLSearchParams({ caption, image_url: imageUrl, access_token: token })}`;
  const container = await (await fetch(createUrl, { method: 'POST' })).json();
  if (container.error) throw new Error(`Container: ${container.error.message}`);

  // 2. aguarda processamento (poll status_code)
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const st = await (await fetch(`${GRAPH}/${container.id}?fields=status_code&access_token=${token}`)).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('A imagem não pôde ser processada pelo Instagram.');
  }

  // 3. publica (com retentativa)
  const pubUrl = `${GRAPH}/${igId}/media_publish?${new URLSearchParams({ creation_id: container.id, access_token: token })}`;
  let pub = null;
  for (let i = 0; i < 3; i++) {
    pub = await (await fetch(pubUrl, { method: 'POST' })).json();
    if (!pub.error) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (pub?.error) throw new Error(`Publicação: ${pub.error.message}`);
  return pub.id;
}
```

- [ ] **Step 4: Build + commit**

`npm run build` → `/api/social/sync` e `/api/social/publish` aparecem.
`git add app/api/social lib/meta/graph.js && git commit -m "feat(m3b): endpoints sync/publish do Instagram (posse, sem mock)"`

---

## Task 6: Verificação

- [ ] **Step 1:** `npm run test` → PASS (utils, brands, platforms, metrics).
- [ ] **Step 2:** `npm run build` → todas as rotas compilam.
- [ ] **Step 3:** `npx playwright test tests/e2e/auth.spec.js` → 2/2.
- [ ] **Step 4: Ao vivo** — `npm run dev`, logar, Dashboard da marca GenkaiLabs deve mostrar **seguidores/engajamento/posts reais** do @genkailabs (não empty state). Conferir no log um `GET /dashboard 200`. Se a Graph API falhar, o dashboard mostra o erro real (honesto), não número fake.

---

## Self-Review

**Cobertura:** métricas reais no dashboard ✓ (T3/T4), sync endpoint ✓ (T5), publish endpoint pronto p/ M4 ✓ (T5), sem service role/fallback ✓, engajamento testado ✓ (T1). **Fora:** UI de composer (M4), gráfico histórico (usa `social_analytics_history` acumulando; visual fica p/ depois).

**Placeholder scan:** sem TBD; código real em cada passo.

**Consistência:** `summarizeMedia`/`computeEngagement` (metrics.js) usados por `getBrandInstagramMetrics`; `fetchInstagramProfile`/`fetchInstagramMedia`/`publishInstagramImage` em graph.js usados por metrics-data e rotas. `getBrandInstagramMetrics` retorna `{ok, metrics}`/`{ok:false,error}`/`null` — tratado igual no dashboard e no sync route.
