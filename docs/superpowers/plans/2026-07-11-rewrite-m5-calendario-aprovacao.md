# M5 — Calendário + Aprovação por link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** (1) Calendário mensal dos posts da marca (rascunho/agendado/publicado/erro). (2) Fluxo de aprovação externa: dono gera link por token; cliente abre página pública (sem login), vê o post e aprova/pede ajustes/comenta — tudo dentro da RLS (RPC por token + `approval_comments`).

**Architecture:** Calendário é Server Component que lista `posts` (RLS por dono) + grid mensal client. Aprovação: `requestApproval(postId)` marca `status='waiting_approval'` e expõe `/approve/{approval_token}`. A página pública lê o post via RPC `get_post_by_approval_token` (SECURITY DEFINER, já existe) usando client anônimo; o revisor (anon) grava a decisão em `approval_comments` (`action_taken`). O dono vê os comentários no detalhe do post. Status do post não é mudado pelo anon (RLS) — o dono age a partir do feedback.

**Tech Stack:** Next.js Server/Client Components + Server Actions, Supabase RPC + RLS, Vitest.

**Spec:** §2 (Calendário, Aprovação). Depende de M2 (marcas) e M4 (posts). RLS de posts e RPC de token já prontas (migração 20260707).

---

## Estrutura (resultado)

```
lib/calendar.js                         # monthMatrix, groupPostsByDay, statusMeta (puros)
lib/posts-data.js                       # +listPostsForBrand, +getPostComments
lib/approval-actions.js                 # requestApproval (dono) + submitApproval (anon)
components/calendar/CalendarGrid.jsx     # grid mensal client (navega meses)
components/calendar/PostDetail.jsx       # modal: detalhe + gerar link + comentários
app/(app)/calendar/page.jsx             # (reescrito) lista posts + grid
app/approve/[token]/page.jsx            # pública: lê via RPC
components/approve/ApprovalForm.jsx      # aprovar/pedir ajustes/comentar
tests/unit/calendar.test.js             # TDD dos puros
```

---

## Task 1: `lib/calendar.js` puro (TDD) + dados

**Files:** Create `lib/calendar.js`, `tests/unit/calendar.test.js`; Create/append `lib/posts-data.js`

- [ ] **Step 1: Teste que falha — `tests/unit/calendar.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { monthMatrix, groupPostsByDay, statusMeta } from '@/lib/calendar';

describe('monthMatrix', () => {
  it('julho/2026 começa numa quarta e tem 31 dias', () => {
    const m = monthMatrix(2026, 6); // mês 0-based: 6 = julho
    const flat = m.flat();
    expect(flat.length % 7).toBe(0);
    const days = flat.filter((d) => d && d.inMonth);
    expect(days.length).toBe(31);
    expect(days[0].date.getDay()).toBe(3); // 1/jul/2026 = quarta
  });
});

describe('groupPostsByDay', () => {
  it('agrupa por YYYY-MM-DD do scheduled_at', () => {
    const posts = [
      { id: 'a', scheduled_at: '2026-07-10T12:00:00Z' },
      { id: 'b', scheduled_at: '2026-07-10T18:00:00Z' },
      { id: 'c', scheduled_at: '2026-07-11T09:00:00Z' }
    ];
    const g = groupPostsByDay(posts);
    expect(g['2026-07-10'].map((p) => p.id)).toEqual(['a', 'b']);
    expect(g['2026-07-11'].length).toBe(1);
  });
});

describe('statusMeta', () => {
  it('mapeia status para rótulo e cor', () => {
    expect(statusMeta('published').label).toBe('Publicado');
    expect(statusMeta('scheduled').label).toBe('Agendado');
    expect(statusMeta('desconhecido').label).toBe('Rascunho');
  });
});
```

- [ ] **Step 2: Rodar → falha.** `npx vitest run tests/unit/calendar.test.js`

- [ ] **Step 3: Implementar `lib/calendar.js`**

```js
export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0=dom
  const gridStart = new Date(year, month, 1 - startDow);
  const weeks = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      week.push({ date, inMonth: date.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  // remove última semana se totalmente fora do mês
  const last = weeks[5];
  if (last.every((d) => !d.inMonth)) weeks.pop();
  return weeks;
}

export function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export function groupPostsByDay(posts = []) {
  const g = {};
  for (const p of posts) {
    if (!p.scheduled_at) continue;
    const k = dayKey(p.scheduled_at);
    (g[k] ||= []).push(p);
  }
  return g;
}

const STATUS = {
  published: { label: 'Publicado', color: '#10B981' },
  scheduled: { label: 'Agendado', color: '#6366F1' },
  waiting_approval: { label: 'Em aprovação', color: '#F59E0B' },
  error: { label: 'Erro', color: '#EF4444' },
  draft: { label: 'Rascunho', color: '#8B93A3' }
};

export function statusMeta(status) {
  return STATUS[status] || STATUS.draft;
}
```

- [ ] **Step 4: Rodar → passa.**

- [ ] **Step 5: `lib/posts-data.js` (criar se não existir; senão anexar)**

```js
import { createClient } from '@/lib/supabase/server';

export async function listPostsForBrand(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('posts')
    .select('id, title, content, media_url, status, scheduled_at, approval_token, created_at')
    .eq('brand_id', brandId)
    .order('scheduled_at', { ascending: false });
  return data || [];
}

export async function getPostComments(postId) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('approval_comments')
    .select('author_name, comment, action_taken, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return data || [];
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/calendar.js tests/unit/calendar.test.js lib/posts-data.js
git commit -m "feat(m5): calendario puro (TDD) + leitura de posts/comentarios"
```

---

## Task 2: Actions de aprovação

**Files:** Create `lib/approval-actions.js`

- [ ] **Step 1: Implementar**

```js
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Dono: marca o post para aprovação e devolve o token do link público.
export async function requestApproval(postId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado.' };

  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'waiting_approval' })
    .eq('id', postId)
    .select('approval_token')
    .single();
  if (error) return { error: error.message };

  revalidatePath('/calendar');
  return { ok: true, token: data.approval_token };
}

// Revisor (anon): registra decisão + comentário via approval_comments.
export async function submitApproval({ postId, author, action, comment }) {
  const supabase = await createClient(); // sessão anônima do revisor
  const clean = String(author || '').trim() || 'Cliente';
  const validAction = ['approved', 'changes_requested', 'comment_only'].includes(action) ? action : 'comment_only';

  const { error } = await supabase.from('approval_comments').insert({
    post_id: postId,
    author_name: clean,
    comment: String(comment || '').trim() || '(sem comentário)',
    action_taken: validAction
  });
  if (error) return { error: error.message };
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/approval-actions.js
git commit -m "feat(m5): actions requestApproval (dono) e submitApproval (anon)"
```

---

## Task 3: Calendário (grid + detalhe)

**Files:** Create `components/calendar/CalendarGrid.jsx`, `components/calendar/PostDetail.jsx`; Modify `app/(app)/calendar/page.jsx`

- [ ] **Step 1: `components/calendar/PostDetail.jsx`**

```jsx
'use client';
import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { requestApproval } from '@/lib/approval-actions';
import { statusMeta } from '@/lib/calendar';
import { Button } from '@/components/ui/Button';

export function PostDetail({ post, onClose }) {
  const [token, setToken] = useState(post.approval_token);
  const [status, setStatus] = useState(post.status);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = statusMeta(status);
  const link = typeof window !== 'undefined' && token ? `${window.location.origin}/approve/${token}` : '';

  async function onRequest() {
    setBusy(true);
    const res = await requestApproval(post.id);
    setBusy(false);
    if (res?.ok) { setToken(res.token); setStatus('waiting_approval'); }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-app"><X className="h-4 w-4" /></button>
        </div>
        {post.media_url && <img src={post.media_url} alt="" className="mb-3 max-h-56 w-full rounded-xl border border-line object-cover" />}
        <p className="text-sm text-ink whitespace-pre-wrap">{post.content || '(sem legenda)'}</p>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-bold text-ink">Aprovação do cliente</p>
          {!token || status !== 'waiting_approval' ? (
            <Button size="sm" onClick={onRequest} disabled={busy}>{busy ? 'Gerando…' : 'Gerar link de aprovação'}</Button>
          ) : (
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="flex-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-[11px] text-muted" />
              <button onClick={copy} className="rounded-lg bg-accent px-2.5 py-1.5 text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `components/calendar/CalendarGrid.jsx`**

```jsx
'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthMatrix, groupPostsByDay, dayKey, statusMeta } from '@/lib/calendar';
import { PostDetail } from './PostDetail';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarGrid({ posts }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel, setSel] = useState(null);

  const grid = monthMatrix(year, month);
  const byDay = groupPostsByDay(posts);

  function shift(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => shift(-1)} className="rounded-lg border border-line p-1.5 hover:bg-app"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-extrabold">{MONTHS[month]} {year}</span>
        <button onClick={() => shift(1)} className="rounded-lg border border-line p-1.5 hover:bg-app"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {DOW.map((d) => <div key={d} className="bg-surface px-2 py-1.5 text-center text-[10px] font-bold text-muted">{d}</div>)}
        {grid.flat().map((cell, i) => {
          const dayPosts = cell.inMonth ? (byDay[dayKey(cell.date)] || []) : [];
          return (
            <div key={i} className={`min-h-[74px] bg-surface p-1.5 ${cell.inMonth ? '' : 'opacity-40'}`}>
              <div className="text-[10px] font-bold text-muted">{cell.date.getDate()}</div>
              <div className="mt-1 space-y-1">
                {dayPosts.map((p) => {
                  const m = statusMeta(p.status);
                  return (
                    <button key={p.id} onClick={() => setSel(p)}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-bold text-white"
                      style={{ backgroundColor: m.color }} title={p.content || ''}>
                      {p.content?.slice(0, 18) || 'Post'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {sel && <PostDetail post={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Reescrever `app/(app)/calendar/page.jsx`**

```jsx
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { listPostsForBrand } from '@/lib/posts-data';

export default async function CalendarPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  const posts = active ? await listPostsForBrand(active.id) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Calendário</h1>
        <p className="text-xs text-muted">{active ? <>Posts de <strong>{active.name}</strong></> : 'Crie uma marca primeiro.'}</p>
      </div>
      {!active ? (
        <EmptyState title="Nenhuma marca">Crie/selecione uma marca no topo.</EmptyState>
      ) : (
        <CalendarGrid posts={posts} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add components/calendar "app/(app)/calendar/page.jsx"
git commit -m "feat(m5): calendario mensal com detalhe do post e gerar link de aprovacao"
```

---

## Task 4: Página pública de aprovação

**Files:** Create `app/approve/[token]/page.jsx`, `components/approve/ApprovalForm.jsx`

- [ ] **Step 1: `components/approve/ApprovalForm.jsx`**

```jsx
'use client';
import { useState } from 'react';
import { submitApproval } from '@/lib/approval-actions';
import { Button } from '@/components/ui/Button';

export function ApprovalForm({ postId }) {
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send(action) {
    setBusy(true); setErr('');
    const res = await submitApproval({ postId, author, action, comment });
    setBusy(false);
    if (res?.error) { setErr(res.error); return; }
    setDone(action);
  }

  if (done) {
    return <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
      {done === 'approved' ? 'Aprovado! Obrigado pelo retorno.' : done === 'changes_requested' ? 'Pedido de ajustes enviado.' : 'Comentário enviado.'}
    </p>;
  }

  return (
    <div className="space-y-3">
      <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Seu nome"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comentário (opcional)"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
      {err && <p className="text-xs font-semibold text-red-600">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => send('approved')} disabled={busy}>Aprovar</Button>
        <Button variant="outline" onClick={() => send('changes_requested')} disabled={busy}>Pedir ajustes</Button>
        <Button variant="ghost" onClick={() => send('comment_only')} disabled={busy}>Só comentar</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `app/approve/[token]/page.jsx`** (pública; lê via RPC com client anônimo)

```jsx
import { createClient } from '@/lib/supabase/server';
import { ApprovalForm } from '@/components/approve/ApprovalForm';

export default async function ApprovePage({ params }) {
  const { token } = await params;
  const supabase = await createClient(); // revisor anônimo
  const { data, error } = await supabase.rpc('get_post_by_approval_token', { p_token: token });
  const post = Array.isArray(data) ? data[0] : data;

  if (error || !post) {
    return (
      <div className="min-h-screen grid place-items-center bg-app px-4">
        <p className="text-sm text-muted">Link de aprovação inválido ou expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-4 py-10">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
          <span className="text-sm font-extrabold">SocialHub · Aprovação</span>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-soft space-y-4">
          {post.media_url && <img src={post.media_url} alt="" className="max-h-72 w-full rounded-xl border border-line object-cover" />}
          <p className="text-sm text-ink whitespace-pre-wrap">{post.content || '(sem legenda)'}</p>
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-xs font-bold text-ink">O que você achou?</p>
            <ApprovalForm postId={post.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add app/approve components/approve
git commit -m "feat(m5): pagina publica de aprovacao por token (RPC) + form de decisao"
```

---

## Task 5: Comentários no detalhe (dono vê o feedback)

**Files:** Modify `components/calendar/PostDetail.jsx`

- [ ] **Step 1: Passar comentários e renderizar.** Em `app/(app)/calendar/page.jsx`, os comentários serão carregados sob demanda; para v1 simples, o `PostDetail` recebe `comments` já buscados no server e os lista. Atualizar a página para buscar comentários de todos os posts em aprovação e passar via prop `commentsByPost`, e o `CalendarGrid`/`PostDetail` exibirem. Implementação mínima: no `PostDetail`, adicionar bloco que lista `post.comments` (se vier):

Adicionar antes do fechamento do modal, após o bloco de aprovação:

```jsx
        {Array.isArray(post.comments) && post.comments.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            <p className="text-xs font-bold text-ink">Retornos do cliente</p>
            {post.comments.map((c, i) => (
              <div key={i} className="rounded-lg bg-app p-2 text-[11px]">
                <span className="font-bold text-ink">{c.author_name}</span>
                <span className="ml-1 text-muted">· {c.action_taken === 'approved' ? 'aprovou' : c.action_taken === 'changes_requested' ? 'pediu ajustes' : 'comentou'}</span>
                <p className="mt-0.5 text-ink">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
```

E em `app/(app)/calendar/page.jsx`, enriquecer os posts com comentários:

```jsx
import { listPostsForBrand, getPostComments } from '@/lib/posts-data';
// ...
  let posts = active ? await listPostsForBrand(active.id) : [];
  posts = await Promise.all(posts.map(async (p) =>
    p.status === 'waiting_approval' ? { ...p, comments: await getPostComments(p.id) } : p
  ));
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add components/calendar/PostDetail.jsx "app/(app)/calendar/page.jsx"
git commit -m "feat(m5): dono ve retornos do cliente no detalhe do post"
```

---

## Task 6: Verificação

- [ ] **Step 1:** `npm run test` → PASS (inclui calendar).
- [ ] **Step 2:** `npm run build` → todas as rotas compilam (`/approve/[token]` dinâmica).
- [ ] **Step 3:** `npx playwright test tests/e2e/auth.spec.js` → 2/2.
- [ ] **Step 4: Ao vivo:**
  1. Calendário: o post agendado/publicado aparece no dia certo, com cor do status. Clicar abre o detalhe.
  2. No detalhe, **Gerar link de aprovação** → copiar o `/approve/<token>`.
  3. Abrir esse link numa **aba anônima** (sem login) → ver o post → preencher nome + **Aprovar**.
  4. Voltar ao Calendário (dono), abrir o post → aparece o retorno "fulano aprovou".
  Se falhar, ler o erro (RPC/RLS) e depurar (superpowers:systematic-debugging).

---

## Self-Review

**Cobertura (M5):** calendário mensal por status ✓ (T1/T3), gerar link de aprovação ✓ (T2/T3), página pública por token via RPC ✓ (T4), decisão do cliente gravada ✓ (T2/T4), dono vê o feedback ✓ (T5). **Dentro da RLS:** anon lê via RPC (SECURITY DEFINER) e insere comentário (policy existente); não altera status (só o dono). **Fora:** notificação por e-mail, histórico de versões, expiração de token.

**Placeholder scan:** sem TBD; código real em cada passo.

**Consistência:** `monthMatrix`/`groupPostsByDay`/`statusMeta`/`dayKey` (calendar.js) usados no grid; `listPostsForBrand`/`getPostComments` (posts-data); `requestApproval`/`submitApproval` (approval-actions) entre PostDetail e ApprovalForm; RPC `get_post_by_approval_token` conforme migração. `/approve` já é público no middleware.
