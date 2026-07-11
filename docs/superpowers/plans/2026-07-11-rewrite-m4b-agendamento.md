# M4b — Agendamento de posts + Vercel Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** Agendar um post (imagem+legenda) para uma data/hora futura; um cron publica os posts vencidos automaticamente no Instagram. Sem mock — o mesmo caminho real do M4a, disparado por um job.

**Architecture:** Composer ganha modo "Agendar" (datetime) que grava o post com `status='scheduled'` e `scheduled_at` futuro (imagem já sobe pro Storage na hora). Um Route Handler `/api/cron/publish-due` — protegido por `CRON_SECRET` e rodando com **service role** (sem sessão de usuário, é job de sistema) — busca posts vencidos, publica via `publishInstagramImage`, e marca `published`/`error`. `vercel.json` agenda o cron. Testável local disparando o endpoint à mão com o secret.

**Tech Stack:** Next.js Route Handlers, Supabase service-role client (server-only), Vercel Cron.

**Spec:** §6 Agendamento. Depende de M4a (composer/publish). Service role é uso legítimo aqui (job confiável), não fura RLS de usuário.

**Pré-requisito do usuário:** `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` no `.env.local` (guiado no Task 1).

---

## Estrutura (resultado)

```
lib/supabase/admin.js                 # client service-role (server-only)
lib/posts-actions.js                  # +schedulePost
app/api/cron/publish-due/route.js     # job: publica posts vencidos
components/composer/ComposerForm.jsx  # +modo agora/agendar
vercel.json                           # +crons
```

---

## Task 1: Pré-requisitos (env) + client admin

**Files:** Create `lib/supabase/admin.js`

- [ ] **Step 1: Usuário adiciona segredos ao `.env.local`**

No Supabase Dashboard (projeto `geoqbbrlyepmhwgdbjmz`) → **Settings → API** → copiar **`service_role`** (secret). No `.env.local`, descomentar/preencher:

```
SUPABASE_SERVICE_ROLE_KEY=cole_o_service_role_aqui
CRON_SECRET=um_valor_aleatorio_longo_qualquer
```

(Nunca `NEXT_PUBLIC_`. Reiniciar o dev depois.)

- [ ] **Step 2: `lib/supabase/admin.js` (server-only)**

```js
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Client com service role — SOMENTE em código server-side confiável (cron).
// Ignora RLS; nunca importar em componente client.
export function createAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/admin.js
git commit -m "feat(m4b): client Supabase service-role (server-only, para o cron)"
```

---

## Task 2: Server action `schedulePost`

**Files:** Modify `lib/posts-actions.js` (append)

- [ ] **Step 1: Adicionar ao final de `lib/posts-actions.js`**

```js
export async function schedulePost({ brandId, caption, imageUrl, scheduledAt }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  if (!imageUrl) return { error: 'Envie uma imagem.' };
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    return { error: 'Escolha uma data/hora no futuro.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // posse + IG conectado (RLS)
  const { data: token } = await supabase
    .from('social_tokens')
    .select('platform_user_id')
    .eq('brand_id', brandId).eq('platform', 'instagram').eq('is_active', true)
    .maybeSingle();
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const { error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Post agendado').slice(0, 60),
    content: caption || '',
    media_url: imageUrl,
    networks: ['instagram'],
    status: 'scheduled',
    scheduled_at: when.toISOString()
  });
  if (error) return { error: `Não foi possível agendar: ${error.message}` };

  revalidatePath('/calendar');
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/posts-actions.js
git commit -m "feat(m4b): server action schedulePost"
```

---

## Task 3: Cron `/api/cron/publish-due`

**Files:** Create `app/api/cron/publish-due/route.js`

- [ ] **Step 1: Implementar**

```js
import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { publishInstagramImage } from '@/lib/meta/graph';

export async function GET(request) {
  // Autenticação do cron (Vercel envia Authorization: Bearer $CRON_SECRET)
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const admin = createAdmin();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from('posts')
    .select('id, brand_id, content, media_url')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const post of due || []) {
    const { data: token } = await admin
      .from('social_tokens')
      .select('access_token, platform_user_id')
      .eq('brand_id', post.brand_id).eq('platform', 'instagram').eq('is_active', true)
      .maybeSingle();

    if (!token) {
      await admin.from('posts').update({ status: 'error' }).eq('id', post.id);
      results.push({ id: post.id, status: 'error', reason: 'sem token' });
      continue;
    }
    try {
      const igId = await publishInstagramImage({
        igId: token.platform_user_id, token: token.access_token,
        caption: post.content || '', imageUrl: post.media_url
      });
      await admin.from('posts').update({ status: 'published' }).eq('id', post.id);
      results.push({ id: post.id, status: 'published', igId });
    } catch (e) {
      await admin.from('posts').update({ status: 'error' }).eq('id', post.id);
      results.push({ id: post.id, status: 'error', reason: e.message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/publish-due/route.js
git commit -m "feat(m4b): cron publish-due (service role, protegido por CRON_SECRET)"
```

---

## Task 4: Composer — modo agora/agendar

**Files:** Modify `components/composer/ComposerForm.jsx`

- [ ] **Step 1: Substituir o corpo do componente** (adiciona toggle + datetime; reusa o upload)

```jsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { publishNow, schedulePost } from '@/lib/posts-actions';
import { Button } from '@/components/ui/Button';

async function uploadImage(brandId, file) {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${brandId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export function ComposerForm({ brandId }) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('now'); // 'now' | 'schedule'
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function onPick(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
    setMsg(null);
  }

  async function onSubmit() {
    if (!file) { setMsg({ type: 'err', text: 'Escolha uma imagem.' }); return; }
    if (mode === 'schedule' && !when) { setMsg({ type: 'err', text: 'Escolha data e hora.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const imageUrl = await uploadImage(brandId, file);
      const res = mode === 'now'
        ? await publishNow({ brandId, caption, imageUrl })
        : await schedulePost({ brandId, caption, imageUrl, scheduledAt: new Date(when).toISOString() });
      if (res?.error) throw new Error(res.error);
      setMsg({ type: 'ok', text: mode === 'now' ? 'Publicado no Instagram! 🎉' : 'Post agendado! ⏰' });
      setCaption(''); setFile(null); setPreview(null); setWhen('');
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-ink">Legenda</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
          placeholder="Escreva a legenda do post…"
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-ink">Imagem</label>
        <input type="file" accept="image/*" onChange={onPick}
          className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
      </div>

      {preview && <img src={preview} alt="prévia" className="max-h-64 rounded-xl border border-line object-contain" />}

      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('now')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === 'now' ? 'bg-accent text-white' : 'bg-app text-ink'}`}>Publicar agora</button>
        <button type="button" onClick={() => setMode('schedule')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === 'schedule' ? 'bg-accent text-white' : 'bg-app text-ink'}`}>Agendar</button>
      </div>

      {mode === 'schedule' && (
        <div>
          <label className="mb-1 block text-xs font-bold text-ink">Data e hora</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
        </div>
      )}

      {msg && <p className={`text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}

      <Button onClick={onSubmit} disabled={busy}>
        {busy ? 'Processando…' : mode === 'now' ? 'Publicar agora no Instagram' : 'Agendar publicação'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add components/composer/ComposerForm.jsx
git commit -m "feat(m4b): composer com modo agendar (datetime)"
```

---

## Task 5: `vercel.json` cron + verificação

**Files:** Modify `vercel.json`

- [ ] **Step 1: `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "crons": [
    { "path": "/api/cron/publish-due", "schedule": "*/5 * * * *" }
  ]
}
```

> Nota de plano: no Vercel **Hobby**, crons rodam no máximo 1×/dia. Para intervalo de minutos, precisa do plano **Pro**, ou um pinger externo (ex.: cron-job.org) batendo no endpoint com o header `Authorization: Bearer $CRON_SECRET`.

- [ ] **Step 2: `npm run test` + `npm run build`** → PASS / compila (rota `/api/cron/publish-due` aparece).

- [ ] **Step 3: `npx playwright test tests/e2e/auth.spec.js`** → 2/2.

- [ ] **Step 4: Verificação ao vivo (local)** — com `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` no `.env.local` e dev rodando:
  1. Composer → agendar um post para ~2 min no futuro. Confirmar "Post agendado! ⏰".
  2. Esperar passar do horário e disparar o cron à mão:
     ```bash
     curl -s -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/publish-due
     ```
     Esperado JSON `{ ok:true, processed:1, results:[{status:"published", igId:...}] }` e o post no feed do IG.
  3. Antes do horário, o mesmo curl deve retornar `processed:0` (não publica adiantado).
  Se falhar, ler o `reason` no JSON e depurar (superpowers:systematic-debugging).

---

## Self-Review

**Cobertura (M4b):** agendar post ✓ (T2/T4), cron publica vencidos ✓ (T3), proteção CRON_SECRET ✓, service role só no job ✓ (T1/T3), config Vercel ✓ (T5). **Fora:** editar/cancelar agendamento (UI vem no M5 calendário), retomada de erros.

**Placeholder scan:** sem TBD; código real. Env do usuário (Task 1) é setup, não placeholder.

**Consistência:** `schedulePost`/`publishNow` em posts-actions, ambos chamados no ComposerForm; `createAdmin` só no cron; `publishInstagramImage` reusado; status `scheduled`→`published`/`error` conforme CHECK do schema; `scheduled_at` (coluna real).

**Risco:** cron automático depende de deploy + plano Vercel. Local, valida-se disparando o endpoint à mão (o que exercita 100% da lógica de publicação de vencidos).
