# M4a — Composer: publicar agora no Instagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** Tela Composer que cria um post (legenda + imagem) e **publica agora de verdade** no Instagram da marca ativa, salvando o post em `posts`. Sem mock — usa a Graph API (endpoint/rotina já portada no M3b).

**Architecture:** Composer é um Client Component: sobe a imagem direto pro Supabase Storage (bucket público `media`) via browser client (sessão do usuário), pega a URL pública, e chama a Server Action `publishNow` que lê o token do IG da marca (RLS), publica via `publishInstagramImage` e grava o post (`status='published'`). Requer uma policy de Storage permitindo upload autenticado no bucket `media` (o app antigo usava service role; o novo usa a sessão) — entregue como migração SQL que o usuário roda uma vez.

**Tech Stack:** Next.js Server Actions + Client Components, Supabase Storage + `@supabase/ssr`, Graph API v21.0.

**Spec:** §2 Composer. Depende de M3a/M3b (IG conectado, `publishInstagramImage` pronto). Verificável ao vivo (posta no @genkailabs).

**Nota de schema:** `posts` tem `content`, `media_url`, `networks[]`, `status`, `scheduled_at`, e `title` NOT NULL. RLS de posts já é por dono da marca.

---

## Estrutura (resultado)

```
supabase/migrations/20260711_storage_media_policy.sql  # policy upload autenticado no bucket media
lib/posts-actions.js                                    # 'use server': publishNow
components/composer/ComposerForm.jsx                    # client: legenda + upload + publicar
app/(app)/composer/page.jsx                             # (reescrito) server: monta form ou avisa "conecte IG"
```

---

## Task 1: Policy de Storage (migração + rodar)

**Files:** Create `supabase/migrations/20260711_storage_media_policy.sql`

- [ ] **Step 1: Escrever a migração**

```sql
-- Permite que usuários autenticados subam/leiam objetos no bucket público `media`.
-- (O bucket já existe e é público; faltava policy de INSERT para a sessão do usuário,
--  já que o app novo não usa service role.)

-- Garante bucket público (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "media authenticated upload" ON storage.objects;
CREATE POLICY "media authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'media');
```

- [ ] **Step 2: Usuário roda a migração**

No Supabase Dashboard (projeto `geoqbbrlyepmhwgdbjmz`) → **SQL Editor** → cola o conteúdo do arquivo → **Run**. Deve retornar sucesso. (Idempotente — pode rodar de novo sem quebrar.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260711_storage_media_policy.sql
git commit -m "feat(m4a): migracao de policy de Storage para upload autenticado no bucket media"
```

---

## Task 2: Server Action `publishNow`

**Files:** Create `lib/posts-actions.js`

- [ ] **Step 1: Implementar**

```js
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage } from '@/lib/meta/graph';

export async function publishNow({ brandId, caption, imageUrl }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  if (!imageUrl) return { error: 'Envie uma imagem (o Instagram exige mídia).' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  // token do IG da marca (RLS garante posse)
  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id')
    .eq('brand_id', brandId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  try {
    const igMediaId = await publishInstagramImage({
      igId: token.platform_user_id,
      token: token.access_token,
      caption: caption || '',
      imageUrl
    });

    // registra o post publicado
    await supabase.from('posts').insert({
      brand_id: brandId,
      title: (caption || 'Post').slice(0, 60),
      content: caption || '',
      media_url: imageUrl,
      networks: ['instagram'],
      status: 'published',
      scheduled_at: new Date().toISOString()
    });

    revalidatePath('/dashboard');
    return { ok: true, id: igMediaId };
  } catch (e) {
    return { error: e.message };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/posts-actions.js
git commit -m "feat(m4a): server action publishNow (publica no IG e grava post)"
```

---

## Task 3: `ComposerForm` (client) — upload + publicar

**Files:** Create `components/composer/ComposerForm.jsx`

- [ ] **Step 1: Implementar**

```jsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { publishNow } from '@/lib/posts-actions';
import { Button } from '@/components/ui/Button';

export function ComposerForm({ brandId }) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function onPick(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
    setMsg(null);
  }

  async function onPublish() {
    if (!file) { setMsg({ type: 'err', text: 'Escolha uma imagem.' }); return; }
    setBusy(true);
    setMsg(null);
    try {
      // 1. upload pro Storage (bucket público media) via sessão do usuário
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${brandId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);

      // 2. publica no IG
      const res = await publishNow({ brandId, caption, imageUrl: pub.publicUrl });
      if (res?.error) throw new Error(res.error);

      setMsg({ type: 'ok', text: 'Publicado no Instagram! 🎉' });
      setCaption(''); setFile(null); setPreview(null);
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

      {preview && (
        <img src={preview} alt="prévia" className="max-h-64 rounded-xl border border-line object-contain" />
      )}

      {msg && (
        <p className={`text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>
      )}

      <Button onClick={onPublish} disabled={busy}>{busy ? 'Publicando…' : 'Publicar agora no Instagram'}</Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/composer/ComposerForm.jsx
git commit -m "feat(m4a): ComposerForm (upload de imagem + publicar agora)"
```

---

## Task 4: Página Composer

**Files:** Modify `app/(app)/composer/page.jsx`

- [ ] **Step 1: Reescrever**

```jsx
import { EmptyState } from '@/components/ui/EmptyState';
import { ComposerForm } from '@/components/composer/ComposerForm';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';

export default async function ComposerPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const connected = active ? await listConnectedPlatforms(active.id) : {};
  const igConnected = !!connected.instagram;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Composer</h1>
        <p className="text-xs text-muted">
          {active ? <>Publicando como <strong>{active.name}</strong> {igConnected && <>· @{connected.instagram.platform_username}</>}</> : 'Crie uma marca primeiro.'}
        </p>
      </div>

      {!active ? (
        <EmptyState title="Nenhuma marca">Crie/selecione uma marca no topo.</EmptyState>
      ) : !igConnected ? (
        <EmptyState title="Instagram não conectado">
          Conecte o Instagram desta marca na aba <strong>Conexões</strong> para publicar.
        </EmptyState>
      ) : (
        <ComposerForm brandId={active.id} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build   # /composer compila
git add "app/(app)/composer/page.jsx"
git commit -m "feat(m4a): pagina Composer (form quando IG conectado, senao avisa)"
```

---

## Task 5: Verificação

- [ ] **Step 1:** `npm run test` → PASS (nada quebrou).
- [ ] **Step 2:** `npm run build` → todas as rotas compilam.
- [ ] **Step 3:** `npx playwright test tests/e2e/auth.spec.js` → 2/2.
- [ ] **Step 4: Ao vivo (com a policy do Task 1 aplicada)** — `npm run dev`, logar, **Composer**: escrever legenda, escolher imagem, **Publicar agora**. Esperado: "Publicado no Instagram! 🎉" e o post aparece de verdade no feed do @genkailabs. Conferir no Dashboard que "Posts" incrementou (após o cache de 10 min ou reconectar). Se falhar, ler o erro real (upload/Graph) e depurar (superpowers:systematic-debugging).

---

## Self-Review

**Cobertura (M4a):** criar post (legenda+imagem) ✓, publicar agora no IG real ✓ (T2/T3), gravar em `posts` ✓, gating "IG não conectado" ✓ (T4). **Fora (M4b):** agendar + Vercel Cron; escolher rede; múltiplas imagens/Reels; salvar rascunho.

**Placeholder scan:** sem TBD; código real em cada passo. A policy de Storage é setup necessário (Task 1), não placeholder.

**Consistência:** `publishNow({brandId, caption, imageUrl})` definido em posts-actions e chamado igual no ComposerForm. `publishInstagramImage` reusado do graph.js (M3b). `listConnectedPlatforms` reusado do M3a. Bucket `media` consistente entre policy e upload.

**Risco:** upload depende da policy do Task 1 estar aplicada. Se o usuário não rodar o SQL, o upload falha com mensagem clara ("Falha no upload: ...") e o post não é publicado (nada de falso sucesso).
