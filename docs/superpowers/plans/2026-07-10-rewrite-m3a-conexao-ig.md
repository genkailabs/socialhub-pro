# M3a — Conexão real do Instagram + UI honesta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Portar o fluxo OAuth real da Meta (Instagram/Facebook) para Next.js Route Handlers e entregar a tela de Conexões honesta — IG conectável de verdade, Facebook conectável, demais redes como "Em breve" desabilitado (sem conexão falsa, sem token manual, sem seguidores digitados, sem QR fake).

**Architecture:** As Route Handlers usam o client `@supabase/ssr` (cookies) → têm a sessão do usuário, então a RLS por dono da marca barra vazamento entre marcas **sem service role** e sem fallback "qualquer token". A tela de Conexões (Server Component) lê os tokens da marca ativa (RLS-scoped) e mostra o estado real; o botão "Conectar" do IG redireciona para `/api/meta/oauth`, que valida posse da marca e manda pro diálogo do Facebook; o callback troca code→token, descobre a conta IG Business e faz upsert em `social_tokens`.

**Tech Stack:** Next.js Route Handlers, Meta Graph API v21.0, `@supabase/ssr`, Vitest.

**Spec:** `.../specs/2026-07-10-rewrite-nucleo-honesto-design.md` (§5 Integrações, §7 Segurança). Depende de M1+M2.

**Pré-requisito do usuário para teste ao vivo:** `META_APP_ID`, `META_APP_SECRET` (rotacionado), `META_OAUTH_SCOPES`, `APP_URL` no `.env.local`. Sem eles, o código compila e a UI renderiza, mas o connect ao vivo não roda. **Service role NÃO é necessário.**

---

## Estrutura de arquivos (resultado do M3a)

```
data/platforms.js                      # 9 redes + flag integrated (IG/FB true)
lib/meta/graph.js                      # sequências Graph API (troca de token, discovery IG)
lib/social-tokens-data.js              # listConnectedPlatforms(brandId) [server, RLS]
app/api/meta/oauth/route.js            # GET: valida posse + redirect ao Facebook
app/api/meta/callback/route.js         # GET: code→token, discovery, upsert social_tokens
components/connections/PlatformCard.jsx        # card client (conectado / conectar / em breve)
components/connections/ConnectionsBanner.jsx   # banner de status via query param
app/(app)/connections/page.jsx         # (reescrito) server: monta seções reais
tests/unit/platforms.test.js           # TDD do helper integrated
```

---

## Task 1: `data/platforms.js` + helper (TDD)

**Files:**
- Create: `data/platforms.js`, `tests/unit/platforms.test.js`

- [ ] **Step 1: Teste que falha — `tests/unit/platforms.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { PLATFORMS, integratedPlatforms, isIntegrated } from '@/data/platforms';

describe('platforms', () => {
  it('tem 9 plataformas', () => { expect(PLATFORMS.length).toBe(9); });
  it('apenas instagram e facebook são integrados no v1', () => {
    expect(integratedPlatforms().map((p) => p.id).sort()).toEqual(['facebook', 'instagram']);
  });
  it('isIntegrated reflete a flag', () => {
    expect(isIntegrated('instagram')).toBe(true);
    expect(isIntegrated('tiktok')).toBe(false);
    expect(isIntegrated('inexistente')).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/platforms.test.js`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `data/platforms.js`**

```js
import { Instagram, Facebook, Youtube, Linkedin, Music, MessageSquare, Video } from 'lucide-react';

// integrated=true → conectável de verdade no v1. false → mostrado como "Em breve".
export const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', subtitle: 'Feed, Reels & Stories', icon: Instagram, color: '#E1306C', integrated: true },
  { id: 'facebook', name: 'Facebook', subtitle: 'Página comercial', icon: Facebook, color: '#1877F2', integrated: true },
  { id: 'youtube', name: 'YouTube', subtitle: 'Canal & Shorts', icon: Youtube, color: '#FF0000', integrated: false },
  { id: 'tiktok', name: 'TikTok', subtitle: 'Creator / Business', icon: Video, color: '#010101', integrated: false },
  { id: 'linkedin', name: 'LinkedIn', subtitle: 'Company Page', icon: Linkedin, color: '#0A66C2', integrated: false },
  { id: 'twitter', name: 'X / Twitter', subtitle: 'Posts & métricas', icon: MessageSquare, color: '#111111', integrated: false },
  { id: 'pinterest', name: 'Pinterest', subtitle: 'Pins & pastas', icon: Music, color: '#E60023', integrated: false },
  { id: 'whatsapp', name: 'WhatsApp', subtitle: 'Business API', icon: MessageSquare, color: '#25D366', integrated: false },
  { id: 'spotify', name: 'Spotify', subtitle: 'Podcasts & músicas', icon: Music, color: '#1DB954', integrated: false }
];

export function integratedPlatforms() {
  return PLATFORMS.filter((p) => p.integrated);
}

export function isIntegrated(id) {
  return PLATFORMS.some((p) => p.id === id && p.integrated);
}

export function platformById(id) {
  return PLATFORMS.find((p) => p.id === id) || null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/platforms.test.js`
Expected: PASS (3 asserts).

- [ ] **Step 5: Commit**

```bash
git add data/platforms.js tests/unit/platforms.test.js
git commit -m "feat(m3a): data/platforms com flag integrated (TDD)"
```

---

## Task 2: `lib/meta/graph.js` — sequências Graph API (portadas)

**Files:**
- Create: `lib/meta/graph.js`

Portado de `legacy/api/meta/callback.js` (troca de token + discovery). Mantém v21.0.

- [ ] **Step 1: Implementar `lib/meta/graph.js`**

```js
const GRAPH = 'https://graph.facebook.com/v21.0';

export function buildAuthUrl({ appId, redirectUri, state, scopes }) {
  const p = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code'
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

export async function exchangeCodeForToken({ code, appId, appSecret, redirectUri }) {
  const url = `${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
  const data = await (await fetch(url)).json();
  if (data.error) throw new Error(data.error.message || 'Erro ao obter access token');
  return data.access_token;
}

export async function exchangeForLongLivedToken({ shortToken, appId, appSecret }) {
  const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
  const data = await (await fetch(url)).json();
  return {
    token: data.access_token || shortToken,
    expiresIn: data.expires_in || 60 * 60 * 24 * 60
  };
}

// Descobre a conta IG Business vinculada a alguma Página do usuário.
// Retorna { igAccount, page } ou lança erro com diagnóstico acionável.
export async function discoverInstagramAccount(longToken) {
  const url = `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}&access_token=${longToken}`;
  const data = await (await fetch(url)).json();
  if (data.error) throw new Error(data.error.message || 'Erro ao buscar páginas do Facebook');

  const pages = data.data || [];
  if (pages.length === 0) {
    throw new Error('Nenhuma Página retornada pelo Facebook. Na autorização, marque TODAS as caixas das suas Páginas e do Instagram.');
  }
  const page = pages.find((p) => p.instagram_business_account);
  if (!page) {
    const names = pages.map((p) => p.name).join(', ');
    throw new Error(`Nenhuma conta Instagram Business vinculada às suas Páginas. Converta o IG para Profissional e vincule a uma Página. Páginas: ${names}`);
  }
  return { igAccount: page.instagram_business_account, page };
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: compila (funções ainda não referenciadas; valida sintaxe).

- [ ] **Step 3: Commit**

```bash
git add lib/meta/graph.js
git commit -m "feat(m3a): lib/meta/graph com sequencias Graph API v21 portadas"
```

---

## Task 3: `/api/meta/oauth` — inicia OAuth com posse validada

**Files:**
- Create: `app/api/meta/oauth/route.js`

- [ ] **Step 1: Implementar `app/api/meta/oauth/route.js`**

```js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/meta/graph';

const DEFAULT_SCOPES = [
  'public_profile', 'pages_show_list', 'pages_read_engagement',
  'instagram_basic', 'instagram_content_publish', 'business_management'
].join(',');

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const brandId = searchParams.get('brand_id');
  const appUrl = process.env.APP_URL || origin;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  // Valida posse da marca (RLS: só retorna se for do usuário)
  if (!brandId) return NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent('Selecione uma marca antes de conectar.')}`);
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent('Marca inválida ou sem permissão.')}`);

  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent('Integração Meta não configurada (META_APP_ID ausente).')}`);

  const state = Buffer.from(JSON.stringify({ brand_id: brandId, uid: user.id, t: Date.now() })).toString('base64');
  const authUrl = buildAuthUrl({
    appId,
    redirectUri: `${appUrl}/api/meta/callback`,
    state,
    scopes: process.env.META_OAUTH_SCOPES || DEFAULT_SCOPES
  });
  return NextResponse.redirect(authUrl);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/meta/oauth/route.js
git commit -m "feat(m3a): route /api/meta/oauth com validacao de posse da marca"
```

---

## Task 4: `/api/meta/callback` — troca token, discovery, upsert (sem service role)

**Files:**
- Create: `app/api/meta/callback/route.js`

- [ ] **Step 1: Implementar `app/api/meta/callback/route.js`**

```js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, exchangeForLongLivedToken, discoverInstagramAccount } from '@/lib/meta/graph';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = process.env.APP_URL || origin;
  const code = searchParams.get('code');
  const error = searchParams.get('error_description') || searchParams.get('error');
  const back = (msg) => NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent(msg)}`);

  if (error) return back(`Falha na autorização: ${error}`);
  if (!code) return back('Código de autorização não recebido da Meta.');

  // Decodifica state → brand_id + uid
  let brandId = null, uid = null;
  try {
    const s = JSON.parse(Buffer.from(searchParams.get('state') || '', 'base64').toString('utf8'));
    brandId = s.brand_id; uid = s.uid;
  } catch { /* state inválido tratado abaixo */ }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !brandId || user.id !== uid) return back('Sessão inválida. Faça login e tente conectar novamente.');

  // Confirma posse da marca (RLS)
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return back('Marca inválida ou sem permissão.');

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return back('Integração Meta não configurada no servidor.');
    const redirectUri = `${appUrl}/api/meta/callback`;

    const shortToken = await exchangeCodeForToken({ code, appId, appSecret, redirectUri });
    const { token: longToken, expiresIn } = await exchangeForLongLivedToken({ shortToken, appId, appSecret });
    const { igAccount, page } = await discoverInstagramAccount(longToken);

    const { error: upErr } = await supabase.from('social_tokens').upsert({
      user_id: user.id,
      brand_id: brandId,
      platform: 'instagram',
      access_token: longToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      platform_user_id: igAccount.id,
      platform_username: igAccount.username || igAccount.name,
      platform_data: { page_id: page.id, page_name: page.name, profile_picture_url: igAccount.profile_picture_url || null },
      is_active: true,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'brand_id,platform' });
    if (upErr) throw new Error(`Erro ao salvar token: ${upErr.message}`);

    const uname = igAccount.username || igAccount.name;
    return NextResponse.redirect(`${appUrl}/connections?status=success&platform=instagram&username=${encodeURIComponent(uname)}`);
  } catch (e) {
    return back(e.message || 'Erro interno ao processar autorização.');
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: rotas `/api/meta/oauth` e `/api/meta/callback` aparecem como `ƒ` (dynamic).

- [ ] **Step 3: Commit**

```bash
git add app/api/meta/callback/route.js
git commit -m "feat(m3a): route /api/meta/callback (token+discovery+upsert via RLS, sem service role)"
```

---

## Task 5: Tela de Conexões honesta

**Files:**
- Create: `lib/social-tokens-data.js`, `components/connections/PlatformCard.jsx`, `components/connections/ConnectionsBanner.jsx`
- Modify (rewrite): `app/(app)/connections/page.jsx`

- [ ] **Step 1: `lib/social-tokens-data.js`**

```js
import { createClient } from '@/lib/supabase/server';

export async function listConnectedPlatforms(brandId) {
  if (!brandId) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_tokens')
    .select('platform, platform_username, platform_data, is_active')
    .eq('brand_id', brandId)
    .eq('is_active', true);
  const map = {};
  (data || []).forEach((t) => { map[t.platform] = t; });
  return map;
}
```

- [ ] **Step 2: `components/connections/ConnectionsBanner.jsx`**

```jsx
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function ConnectionsBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const status = params.get('status');
    const error = params.get('error');
    const username = params.get('username');
    if (status === 'success') setMsg({ type: 'ok', text: `Instagram @${username || ''} conectado com sucesso!` });
    else if (error) setMsg({ type: 'err', text: error });
    if (status || error) router.replace(pathname);
  }, [params, router, pathname]);

  if (!msg) return null;
  const ok = msg.type === 'ok';
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={() => setMsg(null)}><X className="h-4 w-4" /></button>
    </div>
  );
}
```

- [ ] **Step 3: `components/connections/PlatformCard.jsx`**

```jsx
'use client';

export function PlatformCard({ platform, connected, activeBrandId }) {
  const Icon = platform.icon;
  const canConnect = platform.integrated && activeBrandId;

  return (
    <div className={`rounded-xl border bg-surface p-4 ${connected ? 'border-emerald-200' : 'border-line'}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ backgroundColor: platform.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-extrabold ${platform.integrated ? 'text-ink' : 'text-muted'}`}>{platform.name}</p>
          <p className="text-[11px] text-muted">{connected ? `@${connected.platform_username || ''}` : platform.subtitle}</p>
        </div>
        {connected && <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">● real</span>}
        {!platform.integrated && <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-extrabold text-gray-500">Em breve</span>}
      </div>

      <div className="mt-3">
        {connected ? (
          <a href={`/api/meta/oauth?brand_id=${activeBrandId}`}
            className="block w-full rounded-lg bg-app py-2 text-center text-[11px] font-bold text-ink hover:bg-line">Reconectar</a>
        ) : platform.integrated ? (
          canConnect ? (
            <a href={`/api/meta/oauth?brand_id=${activeBrandId}`}
              className="block w-full rounded-lg bg-accent py-2 text-center text-[11px] font-extrabold text-white hover:bg-accent/90">Conectar (OAuth real)</a>
          ) : (
            <div className="w-full rounded-lg bg-gray-100 py-2 text-center text-[11px] font-bold text-gray-400">Crie/selecione uma marca</div>
          )
        ) : (
          <div className="w-full rounded-lg bg-gray-100 py-2 text-center text-[11px] font-bold text-gray-400">Indisponível</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Reescrever `app/(app)/connections/page.jsx`**

```jsx
import { Suspense } from 'react';
import { PLATFORMS } from '@/data/platforms';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { PlatformCard } from '@/components/connections/PlatformCard';
import { ConnectionsBanner } from '@/components/connections/ConnectionsBanner';

export default async function ConnectionsPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connectedMap = active ? await listConnectedPlatforms(active.id) : {};

  const connected = PLATFORMS.filter((p) => connectedMap[p.id]);
  const available = PLATFORMS.filter((p) => p.integrated && !connectedMap[p.id]);
  const soon = PLATFORMS.filter((p) => !p.integrated);

  const Section = ({ title, items }) => items.length ? (
    <div className="mb-8">
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted">{title}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => <PlatformCard key={p.id} platform={p} connected={connectedMap[p.id]} activeBrandId={active?.id} />)}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">Conexões</h1>
        <p className="text-xs text-muted">
          {active ? <>Marca: <strong>{active.name}</strong> · conecte para publicar e ver métricas reais</> : 'Crie uma marca para conectar redes.'}
        </p>
      </div>
      <Suspense><ConnectionsBanner /></Suspense>
      <Section title={`Conectado (${connected.length})`} items={connected} />
      <Section title="Disponível agora" items={available} />
      <Section title="Em breve · integração real em desenvolvimento" items={soon} />
    </div>
  );
}
```

- [ ] **Step 5: Build + commit**

Run: `npm run build`
Expected: `/connections` compila (dynamic).

```bash
git add lib/social-tokens-data.js components/connections "app/(app)/connections/page.jsx"
git commit -m "feat(m3a): tela de Conexoes honesta (IG real, demais Em breve)"
```

---

## Task 6: Verificação

- [ ] **Step 1: Unit + build + e2e auth**

Run: `npm run test` → PASS (utils, brands, platforms).
Run: `npm run build` → todas as rotas compilam.
Run: `npx playwright test tests/e2e/auth.spec.js` → 2/2.

- [ ] **Step 2: Verificação manual — sem chaves Meta**

`npm run dev`, logar, criar/selecionar marca, ir em Conexões:
- IG aparece em "Disponível agora" com "Conectar (OAuth real)"; TikTok/LinkedIn/etc em "Em breve/Indisponível".
- Clicar "Conectar" sem `META_APP_ID` → volta com banner de erro "Integração Meta não configurada". (Comportamento honesto, esperado.)

- [ ] **Step 3: Verificação ao vivo — com chaves Meta (quando o usuário fornecer)**

Com `META_APP_ID/SECRET` no `.env.local` e o callback `APP_URL/api/meta/callback` registrado no app Meta: clicar "Conectar" → diálogo do Facebook → autorizar → volta com "@conta conectada"; a rede aparece em "Conectado ● real". Registrar o resultado. Se falhar, depurar (superpowers:systematic-debugging) com a mensagem exata da Graph API.

---

## Self-Review (preenchido)

**Cobertura (M3a):** OAuth init com posse ✓ (T3), callback token+discovery+upsert ✓ (T4), sem service role/fallback/genkailabs ✓ (RLS via cookies), gating "Em breve" ✓ (T1/T5), UI honesta sem token manual/QR/seguidores digitados ✓ (T5). **Fora do M3a (vai pro M3b):** sync de métricas reais, dashboard com dados reais, endpoint de publish.

**Placeholder scan:** sem TBD/TODO; código real em cada passo.

**Consistência:** `buildAuthUrl`, `exchangeCodeForToken`, `exchangeForLongLivedToken`, `discoverInstagramAccount` definidos em `lib/meta/graph.js` e usados igual nas rotas. `PLATFORMS`/`integratedPlatforms`/`isIntegrated` de `data/platforms.js`. `listConnectedPlatforms` de `lib/social-tokens-data.js`. Query param `status`/`error`/`username` consistente entre callback e banner.

**Risco conhecido:** verificação ao vivo depende de chaves Meta do usuário; até lá, só o caminho "não configurado" (erro honesto) é exercível.
