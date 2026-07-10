# M2 — Marcas (CRUD + Marca Ativa) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o usuário crie, liste, troque e exclua suas marcas (workspaces), com a marca ativa persistida em cookie e legível por Server Components — substituindo o `BrandSwitcher` placeholder do M1 por um funcional.

**Architecture:** Marcas vêm do Supabase via server client (RLS filtra pelo dono). A marca ativa é guardada num cookie `active_brand_id` (legível server-side, ao contrário de localStorage) e alterada por Server Actions que revalidam o layout. O `(app)/layout` busca marcas + marca ativa e injeta no `Topbar → BrandSwitcher`. Sem context React global no M2 (cookie é a fonte da verdade); provider client entra quando um milestone precisar de acesso client-wide.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), `@supabase/ssr`, cookies, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-rewrite-nucleo-honesto-design.md` (§2 Workspaces/Marcas). Depende do M1 (branch `rewrite/nextjs`).

**Nota RLS:** a policy de `brands` é `FOR ALL USING (auth.uid() = user_id)`; o Postgres reaproveita o USING como WITH CHECK, então INSERT com `user_id = auth.uid()` é permitido. Nenhuma migração necessária.

---

## Estrutura de arquivos (resultado do M2)

```
lib/brands.js                          # brandFromRow(), validateBrandName() [puros] + listBrands(), getActiveBrandId()
app/(app)/brand-actions.js             # 'use server': createBrand, switchBrand, deleteBrand
components/workspace/NewBrandModal.jsx  # modal client de criação
components/workspace/BrandBadge.jsx     # avatar/inicial colorida reutilizável
components/layout/BrandSwitcher.jsx     # (reescrito) dropdown funcional
components/layout/Topbar.jsx            # (mod) recebe brands+activeId, passa ao switcher
app/(app)/layout.jsx                    # (mod) busca marcas + activeId, injeta no Topbar
app/(app)/dashboard/page.jsx           # (mod) saúda marca ativa ou pede pra criar
tests/unit/brands.test.js              # TDD dos puros
```

---

## Task 1: `lib/brands.js` — funções puras (TDD) + acesso a dados

**Files:**
- Create: `lib/brands.js`, `tests/unit/brands.test.js`

- [ ] **Step 1: Escrever teste que falha — `tests/unit/brands.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { brandFromRow, validateBrandName } from '@/lib/brands';

describe('brandFromRow', () => {
  it('mapeia linha do DB para shape da app com defaults', () => {
    const row = { id: 'b1', name: 'Genkai Labs', color: null, category: null, handle: null };
    expect(brandFromRow(row)).toEqual({
      id: 'b1', name: 'Genkai Labs', handle: '@genkailabs', category: 'Geral', color: '#6366F1'
    });
  });
  it('preserva handle/category/color quando presentes', () => {
    const row = { id: 'b2', name: 'Acme', handle: '@acme', category: 'Varejo', color: '#FF0000' };
    expect(brandFromRow(row)).toMatchObject({ handle: '@acme', category: 'Varejo', color: '#FF0000' });
  });
});

describe('validateBrandName', () => {
  it('retorna nome aparado quando válido', () => {
    expect(validateBrandName('  Minha Marca  ')).toBe('Minha Marca');
  });
  it('lança quando vazio ou curto demais', () => {
    expect(() => validateBrandName('  ')).toThrow();
    expect(() => validateBrandName('a')).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/brands.test.js`
Expected: FAIL — `Cannot find module '@/lib/brands'`.

- [ ] **Step 3: Implementar `lib/brands.js`**

```js
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const ACTIVE_COOKIE = 'active_brand_id';
const DEFAULT_COLOR = '#6366F1';

export function slugHandle(name) {
  return '@' + String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function brandFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle || slugHandle(row.name),
    category: row.category || 'Geral',
    color: row.color || DEFAULT_COLOR
  };
}

export function validateBrandName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 2) throw new Error('O nome da marca precisa de pelo menos 2 caracteres.');
  return trimmed;
}

export async function listBrands() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error || !data) return [];
  return data.map(brandFromRow);
}

export async function getActiveBrandId() {
  const store = await cookies();
  return store.get(ACTIVE_COOKIE)?.value || null;
}

export function resolveActive(brands, activeId) {
  if (!brands.length) return null;
  return brands.find((b) => b.id === activeId) || brands[0];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/brands.test.js`
Expected: PASS (4 asserts).

- [ ] **Step 5: Commit**

```bash
git add lib/brands.js tests/unit/brands.test.js
git commit -m "feat(m2): lib/brands com funcoes puras (TDD) e acesso a dados"
```

---

## Task 2: Server Actions de marca

**Files:**
- Create: `app/(app)/brand-actions.js`

- [ ] **Step 1: Implementar `app/(app)/brand-actions.js`**

```js
'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_COOKIE, validateBrandName, slugHandle } from '@/lib/brands';

const COOKIE_OPTS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' };

export async function createBrand(formData) {
  let name;
  try {
    name = validateBrandName(formData.get('name'));
  } catch (e) {
    return { error: e.message };
  }
  const category = String(formData.get('category') || 'Geral');
  const color = String(formData.get('color') || '#6366F1');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  const { data, error } = await supabase
    .from('brands')
    .insert({ user_id: user.id, name, handle: slugHandle(name), category, color })
    .select('id')
    .single();

  if (error) return { error: `Não foi possível criar a marca: ${error.message}` };

  const store = await cookies();
  store.set(ACTIVE_COOKIE, data.id, COOKIE_OPTS);
  revalidatePath('/', 'layout');
  return { ok: true, id: data.id };
}

export async function switchBrand(id) {
  const store = await cookies();
  store.set(ACTIVE_COOKIE, id, COOKIE_OPTS);
  revalidatePath('/', 'layout');
}

export async function deleteBrand(id) {
  const supabase = await createClient();
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) return { error: error.message };

  const store = await cookies();
  if (store.get(ACTIVE_COOKIE)?.value === id) store.delete(ACTIVE_COOKIE);
  revalidatePath('/', 'layout');
  return { ok: true };
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npm run build`
Expected: compila sem erro (as actions são referenciadas nos próximos passos; build só valida sintaxe/imports aqui).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/brand-actions.js"
git commit -m "feat(m2): server actions createBrand/switchBrand/deleteBrand"
```

---

## Task 3: `BrandBadge` + `NewBrandModal`

**Files:**
- Create: `components/workspace/BrandBadge.jsx`, `components/workspace/NewBrandModal.jsx`

- [ ] **Step 1: `components/workspace/BrandBadge.jsx`**

```jsx
export function BrandBadge({ name, color = '#6366F1', size = 20 }) {
  const initials = String(name || '?').trim().slice(0, 2).toUpperCase();
  return (
    <span className="grid place-items-center rounded-md font-extrabold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}>
      {initials}
    </span>
  );
}
```

- [ ] **Step 2: `components/workspace/NewBrandModal.jsx`**

```jsx
'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createBrand } from '@/app/(app)/brand-actions';
import { Button } from '@/components/ui/Button';

const COLORS = ['#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export function NewBrandModal({ open, onClose }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!open) { setError(''); setSaving(false); setColor(COLORS[0]); }
  }, [open]);

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set('color', color);
    const res = await createBrand(fd);
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Nova marca</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-app"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Nome *</label>
            <input name="name" autoFocus required placeholder="Ex: Genkai Labs"
              className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Categoria</label>
            <input name="category" placeholder="Ex: Tecnologia"
              className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Cor</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg ${color === c ? 'ring-2 ring-offset-2 ring-ink' : ''}`}
                  style={{ backgroundColor: c }} aria-label={`cor ${c}`} />
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Criando…' : 'Criar marca'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/workspace/BrandBadge.jsx components/workspace/NewBrandModal.jsx
git commit -m "feat(m2): BrandBadge e NewBrandModal (criacao de marca)"
```

---

## Task 4: `BrandSwitcher` funcional

**Files:**
- Modify (rewrite): `components/layout/BrandSwitcher.jsx`

- [ ] **Step 1: Reescrever `components/layout/BrandSwitcher.jsx`**

```jsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { switchBrand } from '@/app/(app)/brand-actions';
import { BrandBadge } from '@/components/workspace/BrandBadge';
import { NewBrandModal } from '@/components/workspace/NewBrandModal';

export function BrandSwitcher({ brands = [], activeId }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const ref = useRef(null);
  const active = brands.find((b) => b.id === activeId) || brands[0] || null;

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-line bg-app px-2.5 py-1.5 text-xs font-bold text-ink hover:border-accent/40">
        {active ? <BrandBadge name={active.name} color={active.color} /> : <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[9px] font-extrabold text-white">—</span>}
        {active ? active.name : 'Nenhuma marca'}
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-soft">
          {brands.length === 0 && <p className="px-2.5 py-2 text-xs text-muted">Nenhuma marca ainda.</p>}
          {brands.map((b) => (
            <button key={b.id}
              onClick={async () => { setOpen(false); await switchBrand(b.id); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-ink hover:bg-app">
              <BrandBadge name={b.name} color={b.color} />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === active?.id && <Check className="h-3.5 w-3.5 text-accent" />}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button onClick={() => { setOpen(false); setModal(true); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-accent hover:bg-accent-tint">
            <Plus className="h-3.5 w-3.5" /> Nova marca
          </button>
        </div>
      )}

      <NewBrandModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/BrandSwitcher.jsx
git commit -m "feat(m2): BrandSwitcher funcional (listar, trocar, criar)"
```

---

## Task 5: Ligar layout + Topbar + Dashboard

**Files:**
- Modify: `app/(app)/layout.jsx`, `components/layout/Topbar.jsx`, `app/(app)/dashboard/page.jsx`

- [ ] **Step 1: `app/(app)/layout.jsx` — buscar marcas + activeId e passar adiante**

```jsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';
import { listBrands, getActiveBrandId } from '@/lib/brands';

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const brands = await listBrands();
  const activeId = await getActiveBrandId();

  return <AppShell brands={brands} activeId={activeId}>{children}</AppShell>;
}
```

- [ ] **Step 2: `components/layout/AppShell.jsx` — repassar props ao Topbar**

```jsx
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children, brands, activeId }) {
  return (
    <div className="flex h-screen bg-app">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar brands={brands} activeId={activeId} />
        <main className="min-h-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `components/layout/Topbar.jsx` — passar ao BrandSwitcher**

```jsx
import { BrandSwitcher } from './BrandSwitcher';
import { signOut } from '@/app/login/actions';

export function Topbar({ brands, activeId }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-5">
      <BrandSwitcher brands={brands} activeId={activeId} />
      <form action={signOut}>
        <button className="text-xs font-semibold text-muted hover:text-ink">Sair</button>
      </form>
    </header>
  );
}
```

- [ ] **Step 4: `app/(app)/dashboard/page.jsx` — saudar marca ativa ou pedir criação**

```jsx
import { EmptyState } from '@/components/ui/EmptyState';
import { listBrands, getActiveBrandId, resolveActive } from '@/lib/brands';

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
          Use o seletor no topo (“Nova marca”) para criar sua primeira marca. Depois conecte o Instagram na aba <strong>Conexões</strong>.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Olá, {active.name}</h1>
        <p className="text-xs text-muted">Métricas reais aparecem aqui após conectar o Instagram desta marca.</p>
      </div>
      <EmptyState title="Sem dados ainda">
        Conecte uma conta na aba <strong>Conexões</strong> para ver seguidores, engajamento e histórico reais. Nada aqui é simulado.
      </EmptyState>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/layout.jsx" components/layout/AppShell.jsx components/layout/Topbar.jsx "app/(app)/dashboard/page.jsx"
git commit -m "feat(m2): ligar marcas ao shell (layout, topbar, dashboard)"
```

---

## Task 6: Verificação e fechamento

**Files:** nenhum novo (verificação)

- [ ] **Step 1: Unit tests**

Run: `npm run test`
Expected: PASS (utils + brands).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: todas as rotas compilam; `(app)/*` dinâmicas.

- [ ] **Step 3: e2e de auth (não deve regredir)**

Run: `npx playwright test tests/e2e/auth.spec.js`
Expected: 2/2 PASS (guard + Google).

- [ ] **Step 4: Verificação manual (dev)**

Run: `npm run dev`, logar, e verificar:
- Sem marcas → dashboard pede criar; seletor mostra "Nenhuma marca".
- Criar marca no modal → aparece no seletor, vira ativa, dashboard saúda pelo nome.
- Criar 2ª marca e trocar no seletor → dashboard troca o nome; recarregar a página mantém a marca ativa (cookie).

Registrar o resultado observado. Se algo falhar, parar e depurar (superpowers:systematic-debugging).

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A && git commit -m "chore(m2): ajustes de verificacao"
```

---

## Self-Review (preenchido)

**Cobertura do spec (M2 = Workspaces/Marcas):** criar ✓ (Task 2/3), listar ✓ (Task 1/5), trocar ativa ✓ (Task 2/4), excluir ✓ (Task 2, UI de exclusão fica p/ quando houver tela de settings da marca — a action existe e é testável), persistência da marca ativa ✓ (cookie, Task 2/5).

**Placeholder scan:** sem TBD/TODO; todo passo com código traz o código real.

**Consistência de nomes:** `brandFromRow`, `validateBrandName`, `slugHandle`, `listBrands`, `getActiveBrandId`, `resolveActive`, `ACTIVE_COOKIE` definidos em `lib/brands.js` e usados igual nas actions/layout. `createBrand`/`switchBrand`/`deleteBrand` idem entre `brand-actions.js`, `NewBrandModal`, `BrandSwitcher`. `BrandBadge`/`NewBrandModal` props consistentes.

**Fora do M2:** UI dedicada de editar/excluir marca (action `deleteBrand` já pronta, botão entra numa tela de settings futura); avatar/logo upload; qualquer métrica (vem do IG real no M3+).
