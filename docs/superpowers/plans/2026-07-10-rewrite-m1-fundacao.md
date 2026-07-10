# M1 — Fundação (Next.js scaffold, Auth, Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converter o SPA Vite em um app Next.js (App Router) com autenticação Supabase real, guarda de rota, e o shell "Studio Light" (sidebar agrupada + topbar + seletor de marca), sem nenhuma tela Demo.

**Architecture:** Conversão *in place* na branch `rewrite/nextjs`. Remove-se a stack Vite (`vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`) e monta-se `app/` (App Router). Auth via `@supabase/ssr` (clients browser + server com cookies), guarda por `middleware.js`. O banco Supabase é **preservado** (nada de migração destrutiva neste milestone). Telas de features entram como stubs honestos (empty state / "Em breve"), preenchidas nos milestones seguintes.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS 3, `@supabase/ssr`, `@supabase/supabase-js`, lucide-react, Radix UI, recharts (mantidos); Vitest (unit) + Playwright (e2e, já instalado).

**Spec:** `docs/superpowers/specs/2026-07-10-rewrite-nucleo-honesto-design.md`

---

## Estrutura de arquivos (resultado do M1)

```
next.config.js               # config Next
middleware.js                # guarda de sessão (refresh cookie + redirect)
vitest.config.js             # runner unit
playwright.config.js         # runner e2e
.env.local                   # NEXT_PUBLIC_* + segredos server (não commitado)
app/
  layout.jsx                 # <html>, fontes, globals.css
  globals.css                # Tailwind + tokens Studio Light
  page.jsx                   # redireciona "/" → /dashboard ou /login
  login/page.jsx             # tela de login (client)
  login/actions.js           # server actions: signIn email, signOut
  auth/callback/route.js     # troca code→sessão (OAuth Google) e volta
  (app)/
    layout.jsx               # guarda de sessão + <AppShell>
    dashboard/page.jsx       # métricas reais (empty state honesto no M1)
    composer/page.jsx        # stub "em construção"
    calendar/page.jsx        # stub
    connections/page.jsx     # stub
    approvals/page.jsx       # stub
components/
  layout/AppShell.jsx        # sidebar + topbar + área de conteúdo
  layout/Sidebar.jsx         # nav agrupada + selo "Em breve"
  layout/Topbar.jsx          # título + BrandSwitcher + user menu
  layout/BrandSwitcher.jsx   # placeholder no M1 (marca ativa fake vazia)
  ui/Button.jsx              # primitivo (cva)
lib/
  supabase/client.js         # createBrowserClient
  lib/supabase/server.js     # createServerClient (cookies)
  utils.js                   # cn()
data/nav.js                  # itens de navegação + flag integrated/soon
tests/
  unit/utils.test.js
  e2e/auth.spec.js
  e2e/shell.spec.js
```

Arquivos **removidos** neste M1: `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `postcss.config.js` (recriado). O restante de `src/` e `api/` é migrado nos milestones seguintes; para não quebrar o build do Next, `src/` legado é movido para `legacy/` (referência) na Task 1.

---

## Task 1: Branch, migração de dependências e limpeza da stack Vite

**Files:**
- Create: branch `rewrite/nextjs`
- Modify: `package.json`
- Delete: `vite.config.js`, `index.html`, `postcss.config.js`
- Move: `src/` → `legacy/src/`, `api/` → `legacy/api/`

- [ ] **Step 1: Criar branch de trabalho**

Run:
```bash
git checkout -b rewrite/nextjs
```
Expected: `Switched to a new branch 'rewrite/nextjs'`

- [ ] **Step 2: Mover código legado para fora do caminho do Next**

Run:
```bash
mkdir -p legacy && git mv src legacy/src && git mv api legacy/api
```
Expected: sem erro. `legacy/src` e `legacy/api` existem (referência para portar nos próximos milestones).

- [ ] **Step 3: Remover arquivos de build do Vite**

Run:
```bash
git rm vite.config.js index.html postcss.config.js
```
Expected: 3 arquivos removidos.

- [ ] **Step 4: Reescrever `package.json`**

Substituir todo o conteúdo por:

```json
{
  "name": "socialhub",
  "private": true,
  "version": "2.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.2",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.428.0",
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vitest": "^2.1.3"
  }
}
```

- [ ] **Step 5: Instalar dependências**

Run:
```bash
npm install
```
Expected: instala `next`, `@supabase/ssr`, `vitest`, `@playwright/test` sem erros de peer-deps que quebrem.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(m1): migrar deps para Next.js e mover legado para legacy/"
```

---

## Task 2: Config Next + Tailwind + tokens Studio Light

**Files:**
- Create: `next.config.js`, `postcss.config.js`, `tailwind.config.js` (sobrescreve), `app/globals.css`, `jsconfig.json`

- [ ] **Step 1: `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' }
    ]
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
      ]
    }];
  }
};
module.exports = nextConfig;
```

- [ ] **Step 2: `postcss.config.js`**

```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
```

- [ ] **Step 3: `jsconfig.json` (alias `@/`)**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

- [ ] **Step 4: `tailwind.config.js` com tokens Studio Light**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './data/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: '#F7F8FA',
        surface: '#FFFFFF',
        line: '#ECEEF2',
        ink: '#1F2430',
        muted: '#8B93A3',
        accent: { DEFAULT: '#6366F1', soft: '#A855F7', tint: '#EEF0FF' }
      },
      boxShadow: { soft: '0 1px 3px rgba(16,20,40,.08)' },
      borderRadius: { xl: '12px' },
      fontFamily: { sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] }
    }
  },
  plugins: []
};
```

- [ ] **Step 5: `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
html, body { height: 100%; }
body { @apply bg-app text-ink antialiased; }
```

- [ ] **Step 6: Commit**

```bash
git add next.config.js postcss.config.js tailwind.config.js jsconfig.json app/globals.css
git commit -m "chore(m1): config Next + Tailwind com tokens Studio Light"
```

---

## Task 3: Infra de testes (Vitest + Playwright) com `cn()` sob TDD

**Files:**
- Create: `vitest.config.js`, `playwright.config.js`, `lib/utils.js`, `tests/unit/utils.test.js`

- [ ] **Step 1: `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['tests/unit/**/*.test.js'] }
});
```

- [ ] **Step 2: Escrever o teste que falha — `tests/unit/utils.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('junta classes e resolve conflito do tailwind-merge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/unit/utils.test.js`
Expected: FAIL — `Cannot find module '@/lib/utils'`.

- [ ] **Step 4: Implementar `lib/utils.js`**

```js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/unit/utils.test.js`
Expected: PASS (2 asserts).

- [ ] **Step 6: `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000
  }
});
```

- [ ] **Step 7: Commit**

```bash
git add vitest.config.js playwright.config.js lib/utils.js tests/unit/utils.test.js
git commit -m "test(m1): infra Vitest+Playwright e util cn() via TDD"
```

---

## Task 4: Clients Supabase (browser + server) e variáveis de ambiente

**Files:**
- Create: `lib/supabase/client.js`, `lib/supabase/server.js`, `.env.local`, `.env.example` (sobrescreve)

- [ ] **Step 1: `.env.example` (sem segredos reais)**

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJ.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
META_OAUTH_SCOPES=public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,business_management
APP_URL=http://localhost:3000
CRON_SECRET=defina_um_valor_aleatorio
```

- [ ] **Step 2: `.env.local` (valores reais, NÃO commitar — já coberto por `.gitignore` `.env.*`)**

Preencher com a URL/anon key reais do projeto `geoqbbrlyepmhwgdbjmz` e `APP_URL=http://localhost:3000`. `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID/SECRET` entram no M3. **Importante:** o `META_APP_SECRET` antigo (exposto no git) deve ser rotacionado no painel Meta antes de reusar.

- [ ] **Step 3: `lib/supabase/client.js` (browser)**

```js
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

- [ ] **Step 4: `lib/supabase/server.js` (server, com cookies)**

```js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* chamado de Server Component: ignorado, middleware renova */ }
        }
      }
    }
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/client.js lib/supabase/server.js .env.example
git commit -m "feat(m1): clients Supabase SSR (browser+server) e env.example"
```

---

## Task 5: Root layout e redirect da raiz

**Files:**
- Create: `app/layout.jsx`, `app/page.jsx`

- [ ] **Step 1: `app/layout.jsx`**

```jsx
import './globals.css';

export const metadata = {
  title: 'SocialHub PRO',
  description: 'Gerenciador de redes sociais multi-marca'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: `app/page.jsx` — decide destino conforme sessão**

```jsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/dashboard' : '/login');
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build conclui sem erro (rota `/` e layout compilam).

- [ ] **Step 4: Commit**

```bash
git add app/layout.jsx app/page.jsx
git commit -m "feat(m1): root layout e redirect da raiz por sessão"
```

---

## Task 6: Autenticação (login e-mail + Google, callback, middleware guard)

**Files:**
- Create: `app/login/page.jsx`, `app/login/actions.js`, `app/auth/callback/route.js`, `middleware.js`, `components/ui/Button.jsx`, `tests/e2e/auth.spec.js`

- [ ] **Step 1: `components/ui/Button.jsx` (primitivo cva)**

```jsx
'use client';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent/90',
        ghost: 'bg-line/60 text-ink hover:bg-line',
        outline: 'border border-line bg-surface text-ink hover:border-accent/40'
      },
      size: { md: 'h-10 px-4 text-sm', sm: 'h-8 px-3 text-xs' }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(styles({ variant, size }), className)} {...props} />;
}
```

- [ ] **Step 2: `app/login/actions.js` (server actions)**

```js
'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signInWithPassword(_prev, formData) {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 3: `app/login/page.jsx` (client, e-mail + botão Google)**

```jsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signInWithPassword } from './actions';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await signInWithPassword(null, new FormData(e.currentTarget));
    if (res?.error) setError(res.error);
  }

  async function googleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-app px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-7 shadow-soft">
        <div className="mb-6 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
          <span className="text-lg font-extrabold">SocialHub</span>
        </div>
        <h1 className="text-xl font-extrabold">Entrar</h1>
        <p className="mb-5 text-sm text-muted">Acesse sua conta para gerenciar suas marcas.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input name="email" type="email" required placeholder="E-mail"
            className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          <input name="password" type="password" required placeholder="Senha"
            className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <Button type="submit" className="w-full">Entrar</Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={googleLogin}>
          Continuar com Google
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `app/auth/callback/route.js` (troca code→sessão do OAuth)**

```js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 5: `middleware.js` (renova sessão + guarda rotas)**

```js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC = ['/login', '/auth', '/approve'];

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
```

- [ ] **Step 6: Teste e2e — `tests/e2e/auth.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('rota protegida sem sessão redireciona para /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('login mostra opção Google', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible();
});
```

- [ ] **Step 7: Rodar e2e de auth**

Run: `npx playwright test tests/e2e/auth.spec.js`
Expected: 2 passes (redirect + botão Google visível). Requer `.env.local` com URL/anon key válidas.

- [ ] **Step 8: Commit**

```bash
git add app/login components/ui/Button.jsx app/auth middleware.js tests/e2e/auth.spec.js
git commit -m "feat(m1): auth Supabase (email+Google), callback e middleware guard"
```

---

## Task 7: App shell — Sidebar (Studio Light), Topbar, BrandSwitcher

**Files:**
- Create: `data/nav.js`, `components/layout/Sidebar.jsx`, `components/layout/Topbar.jsx`, `components/layout/BrandSwitcher.jsx`, `components/layout/AppShell.jsx`, `app/(app)/layout.jsx`

- [ ] **Step 1: `data/nav.js` (itens agrupados + "Em breve")**

```js
import { LayoutDashboard, PenSquare, Calendar, Share2, CheckSquare, Inbox, BarChart3 } from 'lucide-react';

export const NAV_GROUPS = [
  { label: 'Conteúdo', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/composer', label: 'Composer', icon: PenSquare },
    { href: '/calendar', label: 'Calendário', icon: Calendar }
  ]},
  { label: 'Redes', items: [
    { href: '/connections', label: 'Conexões', icon: Share2 }
  ]},
  { label: 'Cliente', items: [
    { href: '/approvals', label: 'Aprovações', icon: CheckSquare }
  ]},
  { label: 'Em breve', items: [
    { href: '#', label: 'Inbox', icon: Inbox, soon: true },
    { href: '#', label: 'Relatórios', icon: BarChart3, soon: true }
  ]}
];
```

- [ ] **Step 2: `components/layout/Sidebar.jsx`**

```jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-surface p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
        <span className="text-sm font-extrabold">SocialHub</span>
      </div>
      <nav className="mt-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                if (item.soon) {
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted opacity-50">
                      <Icon className="h-4 w-4" />{item.label}
                      <span className="ml-auto rounded-full border border-line bg-app px-1.5 py-0.5 text-[8px] font-extrabold">soon</span>
                    </div>
                  );
                }
                return (
                  <Link key={item.href} href={item.href}
                    className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold',
                      active ? 'bg-accent-tint text-accent' : 'text-ink/70 hover:bg-app')}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: `components/layout/BrandSwitcher.jsx` (placeholder M1)**

```jsx
'use client';
import { ChevronDown } from 'lucide-react';

export function BrandSwitcher() {
  return (
    <button className="flex items-center gap-2 rounded-xl border border-line bg-app px-2.5 py-1.5 text-xs font-bold text-ink"
      title="Seleção de marca chega no M2" disabled>
      <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[9px] font-extrabold text-white">—</span>
      Nenhuma marca
      <ChevronDown className="h-3.5 w-3.5 text-muted" />
    </button>
  );
}
```

- [ ] **Step 4: `components/layout/Topbar.jsx`**

```jsx
import { BrandSwitcher } from './BrandSwitcher';
import { signOut } from '@/app/login/actions';

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-5">
      <BrandSwitcher />
      <form action={signOut}>
        <button className="text-xs font-semibold text-muted hover:text-ink">Sair</button>
      </form>
    </header>
  );
}
```

- [ ] **Step 5: `components/layout/AppShell.jsx`**

```jsx
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }) {
  return (
    <div className="flex h-screen bg-app">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `app/(app)/layout.jsx` (guarda + shell)**

```jsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 7: Commit**

```bash
git add data/nav.js components/layout "app/(app)/layout.jsx"
git commit -m "feat(m1): shell Studio Light (sidebar agrupada, topbar, brand switcher)"
```

---

## Task 8: Páginas do (app) — dashboard honesto + stubs

**Files:**
- Create: `app/(app)/dashboard/page.jsx`, `app/(app)/composer/page.jsx`, `app/(app)/calendar/page.jsx`, `app/(app)/connections/page.jsx`, `app/(app)/approvals/page.jsx`, `components/ui/EmptyState.jsx`, `tests/e2e/shell.spec.js`

- [ ] **Step 1: `components/ui/EmptyState.jsx`**

```jsx
export function EmptyState({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center">
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">{children}</p>
    </div>
  );
}
```

- [ ] **Step 2: `app/(app)/dashboard/page.jsx` (empty state honesto — sem métrica fabricada)**

```jsx
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Dashboard</h1>
        <p className="text-xs text-muted">Métricas reais aparecem aqui após conectar o Instagram.</p>
      </div>
      <EmptyState title="Sem dados ainda">
        Conecte uma conta na aba <strong>Conexões</strong> para ver seguidores, engajamento e histórico reais. Nada aqui é simulado.
      </EmptyState>
    </div>
  );
}
```

- [ ] **Step 3: Stubs `composer`, `calendar`, `connections`, `approvals`**

Cada arquivo `app/(app)/<rota>/page.jsx` com este conteúdo (trocar `TITULO`/`DESC`):

`composer`:
```jsx
import { EmptyState } from '@/components/ui/EmptyState';
export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">Composer</h1>
      <EmptyState title="Em construção (M4)">Criação e agendamento de posts chegam no milestone M4.</EmptyState>
    </div>
  );
}
```

`calendar` → título "Calendário", texto "Calendário de posts chega no M5."
`connections` → título "Conexões", texto "Conexão real do Instagram e gating 'Em breve' chegam no M3."
`approvals` → título "Aprovações", texto "Fluxo de aprovação por link chega no M5."

- [ ] **Step 4: Teste e2e do shell — `tests/e2e/shell.spec.js`**

> Requer uma sessão autenticada. Usar um usuário de teste do Supabase e semear cookies via login programático não é trivial em e2e; este teste valida a *estrutura* do shell renderizando a Sidebar num contexto autenticado simulado. No M1, validar via asserção de que a navegação existe quando logado manualmente é aceitável. Marcar como `test.fixme` se não houver usuário de teste configurado.

```js
import { test, expect } from '@playwright/test';

test.fixme('shell mostra navegação agrupada quando autenticado', async ({ page }) => {
  // Pré-condição: sessão válida (configurar storageState com usuário de teste).
  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard')).toBeVisible();
  await expect(page.getByText('Conexões')).toBeVisible();
  await expect(page.getByText('soon').first()).toBeVisible();
});
```

- [ ] **Step 5: Build de verificação**

Run: `npm run build`
Expected: todas as rotas do grupo `(app)` compilam sem erro.

- [ ] **Step 6: Verificação manual (dev)**

Run: `npm run dev` e abrir `http://localhost:3000`.
Expected: sem sessão → `/login`. Após login com usuário Supabase real → `/dashboard` com shell Studio Light, sidebar agrupada, itens "Inbox/Relatórios" com selo `soon` desabilitados. Nenhuma tela Demo.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)" components/ui/EmptyState.jsx tests/e2e/shell.spec.js
git commit -m "feat(m1): dashboard honesto + stubs de rotas + smoke e2e do shell"
```

---

## Task 9: Ajustar `vercel.json` e README para Next.js

**Files:**
- Modify: `vercel.json`, `README.md`

- [ ] **Step 1: `vercel.json` (remover rewrite SPA do Vite; Next cuida do roteamento)**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Atualizar `README.md`**

Trocar a seção Stack para Next.js; remover a menção a "publicação simulada" (agora IG é real e o resto é "Em breve" honesto); documentar `npm run dev` (porta 3000), variáveis `NEXT_PUBLIC_*`, e a nota de rotação do `META_APP_SECRET`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json README.md
git commit -m "docs(m1): vercel.json framework nextjs e README atualizado"
```

---

## Self-Review (preenchido)

**Cobertura do spec (M1):**
- Stack Next.js App Router → Tasks 1–2 ✓
- Auth Supabase (email+Google) → Task 6 ✓
- Guarda de rota / multi-tenant base → Task 6 (middleware) + Task 7 (layout guard) ✓
- Visual Studio Light + IA agrupada → Tasks 2, 7 ✓
- "Em breve" honesto (Inbox/Relatórios) → Task 7 (nav) + Task 8 (stubs) ✓
- Sem dado inventado → Task 8 (dashboard empty state) ✓
- Segredos em env → Task 4 ✓ (service role/Meta entram no M3)
- Preservar banco → nenhuma migração destrutiva no M1 ✓

**Fora do M1 (próximos planos):** conexão IG real portada (M3), RLS multi-marca corrigida (M3), composer/cron (M4), calendário/aprovação/dashboard real (M5), CRUD de marca + BrandSwitcher funcional (M2).

**Placeholder scan:** stubs de features são intencionais e honestos ("Em construção (Mx)"), não placeholders de plano. Todo passo com código traz o código real. `test.fixme` do shell é justificado (depende de usuário de teste; não bloqueia M1).

**Consistência de tipos/nomes:** `createClient()` nomeado igual em `lib/supabase/client.js` (browser) e `lib/supabase/server.js` (server) — importados por caminho distinto, sem colisão. `cn`, `Button`, `AppShell`, `Sidebar`, `Topbar`, `BrandSwitcher`, `EmptyState`, `NAV_GROUPS` referenciados de forma consistente entre tasks.
