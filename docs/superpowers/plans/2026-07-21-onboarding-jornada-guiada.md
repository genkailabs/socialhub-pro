# Jornada Guiada de Onboarding e Brand DNA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a nova jornada guiada de onboarding de 7 etapas em `/onboarding` com interceptação no layout principal e reorganização do Brand Kit (`/brand-kit`) para configuração avançada, eliminando perguntas técnicas iniciais e construindo o Brand DNA e planejamento automaticamente via Instagram.

**Architecture:** A aplicação interceptará marcas com `onboarding_status !== 'completed' && !dna_generated_at` no `AppLayout`/`AppShell`, direcionando-as para a rota dedicada `/onboarding`. O assistente de 7 etapas (`GuidedOnboardingWizard`) persistirá cada avanço na tabela `brand_kits` (`onboarding_step`, `onboarding_answers`), classificará dados em `CONFIRMED`, `INFERRED`, `NOT_FOUND`, e gerará o Brand DNA e ideias da semana. Toda configuração técnica manual migrará para o Brand Kit na aba "Melhorar precisão da IA".

**Tech Stack:** Next.js 15 (App Router, Server Actions, Server/Client Components), React 19, Supabase SSR/Database (`brand_kits`, `brand_dna_versions`, `editorial_plans`), Tailwind CSS, Vitest (Testes Unitários/Integração).

## Global Constraints

- Nunca solicitar logo, website, manual da marca, paleta manual, fontes ou templates no fluxo básico de onboarding (§3.1).
- Regra de entrada obrigatória (§4 e §34): se o usuário não concluiu o onboarding (`onboarding_status !== 'completed' && !dna_generated_at`), redirecionar ou renderizar `/onboarding` antes de permitir acesso ao dashboard principal.
- Classificação rigorosa de dados extraídos (§9): `CONFIRMED` (ex: username, bio), `INFERRED` (ex: segmento, tom, estilo visual), `NOT_FOUND` (ausente).
- Campos obrigatórios para confirmação (§11): `Nome da marca` e `Segmento`.
- Prioridade do Nome da marca (§13): 1. Bio, 2. Nome do perfil, 3. Nome do profissional, 4. Username.
- Prioridade da Paleta (§16): 1. Feed, 2. Avatar, 3. Segmento, 4. Fallback.
- Contas novas / fallback sem IG (§12): solicitar apenas 4 campos simples (`Nome`, `Segmento`, `Serviço principal`, `Cidade`).
- Objetivo (§18): permitir 1 objetivo principal e até 2 secundários.
- Frequência (§19): opções permitidas: `3x semana`, `5x semana`, `diario`, `ia_decide`.
- Planejamento inicial (§22 e §23): gerar apenas ideias (`status: 'idea'`), em formatos `post`, `carrossel`, `story` (proibido gerar Reels/vídeos e conteúdo definitivo no onboarding).
- Salvamento automático a cada passo e retomada exata (§28-§30): gravar `onboarding_step` e `onboarding_answers` via `saveOnboardingProgress`.
- Idioma: Português do Brasil em todo o microcopy amigável e retornos voltados ao usuário.

---

### Task 1: Regras e Funções Auxiliares de Onboarding (`lib/onboarding-helpers.js`)

**Files:**
- Create: `lib/onboarding-helpers.js`
- Create: `tests/unit/onboarding-helpers.test.js`

**Interfaces:**
- Produces:
  - `isOnboardingComplete(kit)`: retorna `boolean`
  - `deriveBrandName(profile, bio)`: retorna `string` seguindo prioridade PRD §13
  - `derivePalettePriority(feedColors, avatarColor, segmentColor)`: retorna `{ accent, bg, surface, ink }` seguindo prioridade PRD §16
  - `classifyInstagramData(profile, media, kitDraft)`: retorna `{ name, segment, audience, tone, frequency, themes, style, classification: { [key]: 'CONFIRMED' | 'INFERRED' | 'NOT_FOUND' } }`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/onboarding-helpers.test.js
import { describe, it, expect } from 'vitest';
import {
  isOnboardingComplete,
  deriveBrandName,
  derivePalettePriority,
  classifyInstagramData
} from '@/lib/onboarding-helpers';

describe('onboarding-helpers', () => {
  it('isOnboardingComplete verifica status ou dna_generated_at', () => {
    expect(isOnboardingComplete(null)).toBe(false);
    expect(isOnboardingComplete({ onboarding_status: 'completed' })).toBe(true);
    expect(isOnboardingComplete({ dna_generated_at: '2026-07-21T10:00:00Z' })).toBe(true);
    expect(isOnboardingComplete({ onboarding_status: 'in_progress' })).toBe(false);
  });

  it('deriveBrandName segue prioridade: Bio > Nome do perfil > Profissional > Username', () => {
    expect(deriveBrandName({ username: 'acme_store', full_name: 'Acme Oficial' }, 'Bem-vindo à Loja Acme')).toBe('Loja Acme');
    expect(deriveBrandName({ username: 'acme_store', full_name: 'Acme Oficial' }, '')).toBe('Acme Oficial');
    expect(deriveBrandName({ username: 'acme_store' }, '')).toBe('acme_store');
  });

  it('derivePalettePriority segue prioridade: Feed > Avatar > Segmento > Fallback', () => {
    const feed = { accent: '#FF5500', bg: '#FFFFFF', surface: '#F4F4F5', ink: '#18181B' };
    const avatar = '#0088FF';
    expect(derivePalettePriority(feed, avatar, '#10B981').accent).toBe('#FF5500');
    expect(derivePalettePriority(null, avatar, '#10B981').accent).toBe('#0088FF');
    expect(derivePalettePriority(null, null, '#10B981').accent).toBe('#10B981');
    expect(derivePalettePriority(null, null, null).accent).toBe('#007AFF');
  });

  it('classifyInstagramData classifica os campos em CONFIRMED, INFERRED e NOT_FOUND', () => {
    const profile = { username: 'cafe_oficial', biography: 'Cafeteria artesanal em SP', followers_count: 1200 };
    const res = classifyInstagramData(profile, [], {});
    expect(res.classification.name).toBe('CONFIRMED');
    expect(res.classification.segment).toBe('INFERRED');
    expect(res.classification.audience).toBe('INFERRED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/onboarding-helpers.test.js`  
Expected: FAIL with "Cannot find module '@/lib/onboarding-helpers'"

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/onboarding-helpers.js
export const DEFAULT_PALETTE = {
  accent: '#007AFF',
  bg: '#FFFFFF',
  surface: '#F4F4F5',
  ink: '#18181B'
};

export function isOnboardingComplete(kit) {
  if (!kit) return false;
  if (kit.onboarding_status === 'completed') return true;
  if (kit.dna_generated_at && kit.dna_generated_at !== '') return true;
  return false;
}

export function deriveBrandName(profile = {}, bio = '') {
  if (bio && typeof bio === 'string') {
    const match = bio.match(/(?:bem-vindo[s]? (?:a|à|ao)|conheça (?:a|o)|loja|clínica|consultório)\s+([A-ZÀ-Ú][a-zà-úA-ZÀ-Ú0-9\s]{2,25})/i);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.length >= 3) return clean;
    }
  }
  if (profile.full_name && profile.full_name.trim().length > 0) {
    return profile.full_name.trim();
  }
  if (profile.username && profile.username.trim().length > 0) {
    return profile.username.trim();
  }
  return 'Sua Marca';
}

export function derivePalettePriority(feedColors, avatarColor, segmentColor) {
  if (feedColors && feedColors.accent) {
    return {
      accent: feedColors.accent,
      bg: feedColors.bg || DEFAULT_PALETTE.bg,
      surface: feedColors.surface || DEFAULT_PALETTE.surface,
      ink: feedColors.ink || DEFAULT_PALETTE.ink
    };
  }
  if (avatarColor && typeof avatarColor === 'string') {
    return { ...DEFAULT_PALETTE, accent: avatarColor };
  }
  if (segmentColor && typeof segmentColor === 'string') {
    return { ...DEFAULT_PALETTE, accent: segmentColor };
  }
  return { ...DEFAULT_PALETTE };
}

export function classifyInstagramData(profile = {}, media = [], kitDraft = {}) {
  const bio = profile.biography || '';
  const name = kitDraft.name || deriveBrandName(profile, bio);
  
  let segment = kitDraft.segment || kitDraft.niche || '';
  if (!segment && bio.length > 0) {
    if (/caf[eé]|restaurante|bistr[oô]|hamburgueria/i.test(bio)) segment = 'Alimentação / Gastronomia';
    else if (/cl[ií]nica|m[eé]dic|dentista|psic[oô]log|sa[uú]de/i.test(bio)) segment = 'Saúde e Bem-estar';
    else if (/advogad|jur[ií]dic|direito/i.test(bio)) segment = 'Serviços Jurídicos';
    else if (/im[oô]ve|imobili[aá]ri|corretor/i.test(bio)) segment = 'Mercado Imobiliário';
    else if (/loja|roupa|moda|acess[oô]ri/i.test(bio)) segment = 'Moda e Varejo';
    else segment = 'Prestação de Serviços / Geral';
  }

  const classification = {
    name: profile.username || profile.full_name ? 'CONFIRMED' : 'NOT_FOUND',
    segment: segment ? 'INFERRED' : 'NOT_FOUND',
    audience: 'INFERRED',
    tone: 'INFERRED',
    style: 'INFERRED',
    palette: media && media.length > 0 ? 'CONFIRMED' : 'INFERRED'
  };

  return {
    name,
    segment: segment || 'Geral',
    audience: kitDraft.audience || 'Público interessado em ' + (segment || 'nossos serviços'),
    tone: kitDraft.tone || 'Profissional, Amigável, Consultiva',
    frequency: kitDraft.frequency || '5x_semana',
    themes: kitDraft.themes || ['Dicas práticas', 'Bastidores e dia a dia', 'Nossos diferenciais', 'Depoimentos e resultados'],
    style: kitDraft.style || 'Moderno e Limpo',
    classification
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/onboarding-helpers.test.js`  
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/onboarding-helpers.js tests/unit/onboarding-helpers.test.js
git commit -m "feat(onboarding): add core helpers and classification logic (§9, §13, §16)"
```

---

### Task 2: Server Actions para Estado de Onboarding (`lib/onboarding-actions.js`)

**Files:**
- Modify: `lib/onboarding-actions.js:1-37`
- Create: `tests/unit/onboarding-actions.test.js`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`
- Produces:
  - `saveOnboardingProgress({ brandId, step, answers, status })`: atualiza status, step e answers JSONB
  - `completeOnboarding({ brandId })`: marca status como `completed`
  - `resetOnboarding({ brandId })`: reinicia o onboarding p/ `not_started` e step 0

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/onboarding-actions.test.js
import { describe, it, expect, vi } from 'vitest';
import { saveOnboardingProgress, completeOnboarding, resetOnboarding } from '@/lib/onboarding-actions';

// Mock do supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'usr-1' } } }) },
    from: vi.fn(() => ({
      upsert: vi.fn(async () => ({ error: null })),
      update: vi.fn(async () => ({ error: null }))
    }))
  }))
}));

describe('onboarding-actions', () => {
  it('saveOnboardingProgress exige brandId', async () => {
    const res = await saveOnboardingProgress({});
    expect(res.error).toBe('Marca não selecionada.');
  });

  it('completeOnboarding retorna ok e seta completed', async () => {
    const res = await completeOnboarding({ brandId: 'brd-1' });
    expect(res.ok).toBe(true);
  });

  it('resetOnboarding retorna ok e seta not_started e step 0', async () => {
    const res = await resetOnboarding({ brandId: 'brd-1' });
    expect(res.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/onboarding-actions.test.js`  
Expected: FAIL on `resetOnboarding is not exported`

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/onboarding-actions.js (substituir arquivo completo ou adicionar resetOnboarding)
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveOnboardingProgress({ brandId, step, answers, status = 'in_progress' }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    onboarding_status: status,
    updated_at: new Date().toISOString()
  };
  if (Number.isInteger(step)) row.onboarding_step = step;
  if (answers && typeof answers === 'object') row.onboarding_answers = answers;

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function completeOnboarding({ brandId }) {
  const res = await saveOnboardingProgress({ brandId, status: 'completed' });
  if (res.ok) {
    revalidatePath('/brand-kit');
    revalidatePath('/dashboard');
    revalidatePath('/onboarding');
  }
  return res;
}

export async function resetOnboarding({ brandId }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {
    brand_id: brandId,
    onboarding_status: 'not_started',
    onboarding_step: 0,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });
  if (error) return { error: error.message };

  revalidatePath('/onboarding');
  revalidatePath('/brand-kit');
  revalidatePath('/dashboard');
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/onboarding-actions.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/onboarding-actions.js tests/unit/onboarding-actions.test.js
git commit -m "feat(onboarding): enhance server actions with resetOnboarding (§28, §30)"
```

---

### Task 3: Opções, Objetivos, Frequências e Badges da Jornada Guiada (`components/onboarding/guided/guided-options.js`)

**Files:**
- Create: `components/onboarding/guided/guided-options.js`
- Create: `tests/unit/guided-options.test.js`

**Interfaces:**
- Produces:
  - `GUIDED_STEPS`: array de `{ step: number, title: string, subtitle: string }` (7 passos)
  - `OBJECTIVES`: array com `{ value: string, label: string, hint: string }`
  - `FREQUENCIES`: array com `{ value: string, label: string, hint: string }`
  - `CLASSIFICATION_BADGES`: map de estilos para `CONFIRMED`, `INFERRED`, `NOT_FOUND`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/guided-options.test.js
import { describe, it, expect } from 'vitest';
import { GUIDED_STEPS, OBJECTIVES, FREQUENCIES, CLASSIFICATION_BADGES } from '@/components/onboarding/guided/guided-options';

describe('guided-options', () => {
  it('GUIDED_STEPS possui 7 etapas com títulos corretos', () => {
    expect(GUIDED_STEPS.length).toBe(7);
    expect(GUIDED_STEPS[0].title).toBe('Boas-vindas');
    expect(GUIDED_STEPS[6].title).toBe('Planejamento da Semana');
  });

  it('OBJECTIVES permite objetivos do PRD', () => {
    const values = OBJECTIVES.map((o) => o.value);
    expect(values).toContain('vender');
    expect(values).toContain('educar');
    expect(values).toContain('captar_leads');
    expect(values).toContain('fortalecer_marca');
  });

  it('FREQUENCIES contém 3x_semana, 5x_semana, diario e ia_decide', () => {
    const values = FREQUENCIES.map((f) => f.value);
    expect(values).toEqual(['3x_semana', '5x_semana', 'diario', 'ia_decide']);
  });

  it('CLASSIFICATION_BADGES tem rótulos para CONFIRMED, INFERRED, NOT_FOUND', () => {
    expect(CLASSIFICATION_BADGES.CONFIRMED.label).toBe('Confirmado');
    expect(CLASSIFICATION_BADGES.INFERRED.label).toBe('Sugerido pela IA');
    expect(CLASSIFICATION_BADGES.NOT_FOUND.label).toBe('Não encontrado');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/guided-options.test.js`  
Expected: FAIL with "Cannot find module '@/components/onboarding/guided/guided-options'"

- [ ] **Step 3: Write minimal implementation**

```javascript
// components/onboarding/guided/guided-options.js
export const GUIDED_STEPS = [
  { step: 0, title: 'Boas-vindas', subtitle: 'Conheça como a inteligência artificial vai preparar tudo para você.' },
  { step: 1, title: 'Conectar Instagram', subtitle: 'Conecte sua conta para que a IA analise seu perfil e suas publicações.' },
  { step: 2, title: 'Análise e Confirmação', subtitle: 'Verifique e confirme os dados essenciais da sua marca.' },
  { step: 3, title: 'Objetivo da Marca', subtitle: 'Selecione o objetivo principal e até dois secundários.' },
  { step: 4, title: 'Frequência de Posts', subtitle: 'Escolha com que frequência deseja publicar.' },
  { step: 5, title: 'Revisão do Brand DNA', subtitle: 'Revise o DNA gerado pela IA antes de ativar.' },
  { step: 6, title: 'Planejamento da Semana', subtitle: 'Suas primeiras ideias de conteúdo prontas para produção.' }
];

export const OBJECTIVES = [
  { value: 'vender', label: 'Vender produtos ou serviços', hint: 'Foco em conversão, ofertas claras e chamadas diretas para compra.' },
  { value: 'educar', label: 'Educar o mercado', hint: 'Ensinar conceitos, tirar dúvidas e gerar autoridade técnica.' },
  { value: 'captar_leads', label: 'Captar leads e contatos', hint: 'Atrair interessados qualificados para conversas no WhatsApp ou formulários.' },
  { value: 'fortalecer_marca', label: 'Fortalecer a marca (Branding)', hint: 'Reconhecimento de marca, posicionamento, bastidores e valores.' },
  { value: 'gerar_autoridade', label: 'Gerar autoridade e referência', hint: 'Destaque para depoimentos, cases de sucesso e diferenciais.' }
];

export const FREQUENCIES = [
  { value: '3x_semana', label: '3x por semana', hint: 'Ideal para manter presença constante com tempo tranquilo de produção.' },
  { value: '5x_semana', label: '5x por semana', hint: 'Ritmo recomendado de segunda a sexta para engajamento contínuo.' },
  { value: 'diario', label: 'Diário (7x por semana)', hint: 'Máximo alcance e crescimento acelerado na rede.' },
  { value: 'ia_decide', label: 'IA decide a frequência', hint: 'A inteligência artificial ajusta conforme seu nicho e melhor alcance.' }
];

export const CLASSIFICATION_BADGES = {
  CONFIRMED: { label: 'Confirmado', className: 'border-success/30 bg-success/10 text-success' },
  INFERRED: { label: 'Sugerido pela IA', className: 'border-accent/30 bg-accent/10 text-accent' },
  NOT_FOUND: { label: 'Não encontrado', className: 'border-warning/30 bg-warning/10 text-warning' }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/guided-options.test.js`  
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/guided/guided-options.js tests/unit/guided-options.test.js
git commit -m "feat(onboarding): define options and badges for guided flow (§5-§19)"
```

---

### Task 4: Componente Visual e Interativo de Onboarding (`components/onboarding/guided/GuidedOnboardingWizard.jsx`)

**Files:**
- Create: `components/onboarding/guided/GuidedOnboardingWizard.jsx`
- Create: `tests/unit/guided-onboarding-wizard.test.js`

**Interfaces:**
- Consumes:
  - `saveOnboardingProgress`, `completeOnboarding` from `@/lib/onboarding-actions`
  - `analyzeBrandDNA`, `approveDnaVersion` from `@/lib/dna-actions`
  - `generateWeekPlan` from `@/lib/planning-actions`
  - `classifyInstagramData`, `derivePalettePriority` from `@/lib/onboarding-helpers`
  - `GUIDED_STEPS`, `OBJECTIVES`, `FREQUENCIES`, `CLASSIFICATION_BADGES` from `./guided-options`
- Produces: React Component `<GuidedOnboardingWizard brandId={string} brandName={string} kit={object} connectedPlatforms={object} />`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/guided-onboarding-wizard.test.js
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuidedOnboardingWizard } from '@/components/onboarding/guided/GuidedOnboardingWizard';

vi.mock('@/lib/onboarding-actions', () => ({
  saveOnboardingProgress: vi.fn(async () => ({ ok: true })),
  completeOnboarding: vi.fn(async () => ({ ok: true }))
}));

vi.mock('@/lib/dna-actions', () => ({
  analyzeBrandDNA: vi.fn(async () => ({ ok: true, version: { id: 'v1' }, dna: { audience: 'Alvo', tone: 'Tom' } })),
  approveDnaVersion: vi.fn(async () => ({ ok: true }))
}));

vi.mock('@/lib/planning-actions', () => ({
  generateWeekPlan: vi.fn(async () => ({ ok: true, count: 5 }))
}));

describe('GuidedOnboardingWizard', () => {
  it('renderiza no Passo 0 (Boas-vindas) por padrão quando não há progresso', () => {
    render(<GuidedOnboardingWizard brandId="brd-1" brandName="Acme" kit={{}} connectedPlatforms={{}} />);
    expect(screen.getByText('Boas-vindas')).toBeDefined();
    expect(screen.getByText(/inteligência artificial vai preparar/i)).toBeDefined();
  });

  it('permite avançar para o Passo 1 (Conectar Instagram) ao clicar em Começar', () => {
    render(<GuidedOnboardingWizard brandId="brd-1" brandName="Acme" kit={{}} connectedPlatforms={{}} />);
    const btn = screen.getByText('Começar configuração automática');
    fireEvent.click(btn);
    expect(screen.getByText('Conectar Instagram')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/guided-onboarding-wizard.test.js`  
Expected: FAIL with "Cannot find module '@/components/onboarding/guided/GuidedOnboardingWizard'"

- [ ] **Step 3: Write minimal implementation**

```jsx
// components/onboarding/guided/GuidedOnboardingWizard.jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ArrowLeft, Instagram, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { saveOnboardingProgress, completeOnboarding } from '@/lib/onboarding-actions';
import { analyzeBrandDNA, approveDnaVersion } from '@/lib/dna-actions';
import { generateWeekPlan } from '@/lib/planning-actions';
import { classifyInstagramData, derivePalettePriority } from '@/lib/onboarding-helpers';
import { GUIDED_STEPS, OBJECTIVES, FREQUENCIES, CLASSIFICATION_BADGES } from './guided-options';

const fieldClass = 'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15';

export function GuidedOnboardingWizard({ brandId, brandName, kit = {}, connectedPlatforms = {} }) {
  const router = useRouter();
  const draft = kit.onboarding_answers || {};
  const resuming = kit.onboarding_status === 'in_progress' && Number(kit.onboarding_step) > 0;

  const [step, setStep] = useState(resuming ? Math.min(Number(kit.onboarding_step), 6) : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Campos de dados
  const [isNewAccountFallback, setIsNewAccountFallback] = useState(Boolean(draft.isNewAccountFallback));
  const [brandNameInput, setBrandNameInput] = useState(draft.name || brandName || '');
  const [segmentInput, setSegmentInput] = useState(draft.segment || kit.niche || '');
  const [serviceInput, setServiceInput] = useState(draft.service || '');
  const [cityInput, setCityInput] = useState(draft.city || '');
  const [audienceInput, setAudienceInput] = useState(draft.audience || kit.audience || '');
  const [toneInput, setToneInput] = useState(draft.tone || kit.tone || 'Profissional, Amigável, Consultiva');
  const [styleInput, setStyleInput] = useState(draft.style || kit.visual_style || 'Moderno e Limpo');
  const [paletteInput, setPaletteInput] = useState(draft.palette || derivePalettePriority(kit.palette, null, null));

  // Objetivos e Frequência
  const [mainObjective, setMainObjective] = useState(draft.mainObjective || 'vender');
  const [secObjectives, setSecObjectives] = useState(draft.secObjectives || []);
  const [frequency, setFrequency] = useState(draft.frequency || '5x_semana');

  // DNA e Planejamento gerados
  const [generatedDna, setGeneratedDna] = useState(draft.generatedDna || null);
  const [dnaProposalId, setDnaProposalId] = useState(draft.dnaProposalId || null);
  const [planSummary, setPlanSummary] = useState(null);

  const igConnected = Boolean(connectedPlatforms?.instagram?.is_active);
  const pct = Math.round(((step + 1) / 7) * 100);

  function getDraftAnswers() {
    return {
      name: brandNameInput,
      segment: segmentInput,
      service: serviceInput,
      city: cityInput,
      audience: audienceInput,
      tone: toneInput,
      style: styleInput,
      palette: paletteInput,
      mainObjective,
      secObjectives,
      frequency,
      isNewAccountFallback,
      generatedDna,
      dnaProposalId
    };
  }

  function go(nextStep) {
    setError(null);
    setStep(nextStep);
    saveOnboardingProgress({ brandId, step: nextStep, answers: getDraftAnswers() }).catch(() => {});
  }

  function toggleSecObjective(val) {
    if (val === mainObjective) return;
    if (secObjectives.includes(val)) {
      setSecObjectives(secObjectives.filter((x) => x !== val));
    } else if (secObjectives.length < 2) {
      setSecObjectives([...secObjectives, val]);
    }
  }

  async function runStep3Analysis() {
    setError(null);
    const profileData = connectedPlatforms?.instagram?.platform_data || {};
    const classified = classifyInstagramData(profileData, [], getDraftAnswers());
    if (!brandNameInput) setBrandNameInput(classified.name);
    if (!segmentInput) setSegmentInput(classified.segment);
    if (!audienceInput) setAudienceInput(classified.audience);
    if (!toneInput) setToneInput(classified.tone);
    if (!styleInput) setStyleInput(classified.style);
    go(2);
  }

  async function generateAndPreviewDna() {
    setBusy(true);
    setError(null);
    try {
      const allObjectives = [mainObjective, ...secObjectives].join(', ');
      const manual = {
        niche: segmentInput,
        audience: audienceInput,
        objetivo: allObjectives,
        tone: toneInput,
        visual_style: styleInput
      };
      const res = await analyzeBrandDNA({
        brandId,
        brandName: brandNameInput,
        wantIg: igConnected,
        manual
      });
      setBusy(false);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setGeneratedDna(res.dna);
      if (res.version?.id) setDnaProposalId(res.version.id);
      const updatedAnswers = { ...getDraftAnswers(), generatedDna: res.dna, dnaProposalId: res.version?.id || null };
      saveOnboardingProgress({ brandId, step: 5, answers: updatedAnswers }).catch(() => {});
      setStep(5);
    } catch (e) {
      setBusy(false);
      setError('Erro ao gerar o Brand DNA. Tente novamente.');
    }
  }

  async function confirmDnaAndGeneratePlan() {
    setBusy(true);
    setError(null);
    try {
      if (dnaProposalId) {
        const appRes = await approveDnaVersion({ brandId, versionId: dnaProposalId });
        if (appRes?.error) {
          setError(appRes.error);
          setBusy(false);
          return;
        }
      }
      const planRes = await generateWeekPlan({ brandId });
      setBusy(false);
      if (planRes?.error) {
        setError(`Brand DNA aprovado, mas aviso no planejamento: ${planRes.error}`);
        setPlanSummary({ ok: true, note: 'DNA ativado! O plano poderá ser gerado a qualquer momento em Planejamento.' });
      } else {
        setPlanSummary({ ok: true, count: planRes.count || 5 });
      }
      await completeOnboarding({ brandId }).catch(() => {});
      setStep(6);
    } catch (e) {
      setBusy(false);
      setError('Erro ao finalizar. Tente novamente.');
    }
  }

  const stepInfo = GUIDED_STEPS[step] || GUIDED_STEPS[0];

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6">
      {/* Barra de Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-accent">{stepInfo.title} — Passo {step + 1} de 7</span>
          <span className="text-faint">{pct}%</span>
        </div>
        <div className="flex gap-1">
          {GUIDED_STEPS.map((s, i) => (
            <div key={s.step} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">{stepInfo.title}</h1>
        <p className="text-sm text-muted">{stepInfo.subtitle}</p>
      </div>

      {/* Cartão de Conteúdo Principal */}
      <div className="rounded-3xl glass p-6 shadow-soft space-y-6">
        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-surface-2 p-5 space-y-3">
              <h3 className="font-bold text-ink">O que faremos agora:</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Conectamos seu Instagram para leitura automática de bio, tom e visual</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Você confirma apenas o nome da marca e o segmento principal</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> A IA gera o Brand DNA e as 5 primeiras ideias de post da semana</li>
              </ul>
            </div>
            <p className="text-xs text-faint">Sem perguntas técnicas complexas. Você poderá personalizar paleta manual, fontes ou logo depois, no Brand Kit avançado.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            {igConnected ? (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Instagram className="h-6 w-6 text-success" />
                  <div>
                    <p className="text-sm font-bold text-ink">Instagram Conectado</p>
                    <p className="text-xs text-muted">@{connectedPlatforms?.instagram?.platform_username || 'conta_ativa'}</p>
                  </div>
                </div>
                <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-white">Pronto</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  type="button"
                  className="w-full justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-95"
                  onClick={() => router.push(`/connections?return_to=/onboarding`)}
                >
                  <Instagram className="h-5 w-5" /> Conectar conta do Instagram
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsNewAccountFallback(!isNewAccountFallback)}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {isNewAccountFallback ? 'Esconder preenchimento manual' : 'Conta nova ou sem Instagram? Preencher básico manualmente'}
                  </button>
                </div>
              </div>
            )}

            {isNewAccountFallback && (
              <div className="rounded-2xl border border-line bg-surface-2 p-5 space-y-4">
                <p className="text-xs font-bold text-ink">Preenchimento Básico (Contas Novas ou Sem Instagram)</p>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Nome da Marca *</label>
                  <input value={brandNameInput} onChange={(e) => setBrandNameInput(e.target.value)} placeholder="Ex: Clínica Sorrir" className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Segmento *</label>
                  <input value={segmentInput} onChange={(e) => setSegmentInput(e.target.value)} placeholder="Ex: Odontologia e Estética" className={fieldClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Serviço Principal</label>
                    <input value={serviceInput} onChange={(e) => setServiceInput(e.target.value)} placeholder="Ex: Clareamento e Implantes" className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Cidade</label>
                    <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="Ex: São Paulo - SP" className={fieldClass} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Revise os dados detectados pela IA:</span>
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-accent">Edite apenas se necessário</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Nome da Marca *</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.CONFIRMED.className}`}>
                    {CLASSIFICATION_BADGES.CONFIRMED.label}
                  </span>
                </div>
                <input value={brandNameInput} onChange={(e) => setBrandNameInput(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Segmento / Mercado *</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.INFERRED.className}`}>
                    {CLASSIFICATION_BADGES.INFERRED.label}
                  </span>
                </div>
                <input value={segmentInput} onChange={(e) => setSegmentInput(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Público-alvo sugerido</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.INFERRED.className}`}>
                    {CLASSIFICATION_BADGES.INFERRED.label}
                  </span>
                </div>
                <input value={audienceInput} onChange={(e) => setAudienceInput(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Tom de voz sugerido</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.INFERRED.className}`}>
                    {CLASSIFICATION_BADGES.INFERRED.label}
                  </span>
                </div>
                <input value={toneInput} onChange={(e) => setToneInput(e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-ink mb-2">Selecione 1 Objetivo Principal:</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {OBJECTIVES.map((o) => {
                  const on = mainObjective === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setMainObjective(o.value)}
                      className={`rounded-xl border p-3.5 text-left transition-colors ${on ? 'border-accent bg-accent/10 ring-2 ring-accent/20' : 'border-line bg-surface-2 hover:border-accent/50'}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-ink">
                        {on && <Check className="h-4 w-4 text-accent" />} {o.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{o.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-line">
              <p className="text-sm font-bold text-ink mb-1">Objetivos Secundários (Até 2 opcionais):</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {OBJECTIVES.filter((o) => o.value !== mainObjective).map((o) => {
                  const on = secObjectives.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleSecObjective(o.value)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'border-accent bg-accent text-white' : 'border-line bg-surface-2 text-ink hover:border-accent/40'}`}
                    >
                      {on && <Check className="mr-1 inline h-3 w-3" />} {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-ink">Com que frequência deseja publicar por semana?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FREQUENCIES.map((f) => {
                const on = frequency === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${on ? 'border-accent bg-accent/10 ring-2 ring-accent/20' : 'border-line bg-surface-2 hover:border-accent/50'}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-ink">
                      {on && <Check className="h-4 w-4 text-accent" />} {f.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted">{f.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            {generatedDna ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Sparkles className="h-4 w-4" /> Brand DNA Gerado pela IA
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="font-bold text-muted">Tom de Voz:</dt>
                      <dd className="text-ink font-semibold mt-0.5">{generatedDna.tone || toneInput}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-muted">Público-alvo:</dt>
                      <dd className="text-ink font-semibold mt-0.5">{generatedDna.audience || audienceInput}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-bold text-muted">Pilares de Conteúdo Recomendados:</dt>
                      <dd className="text-ink font-semibold mt-0.5">
                        {Array.isArray(generatedDna.pillars) ? generatedDna.pillars.join(', ') : 'Dicas de valor, Bastidores e dia a dia, Prova social e resultados'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <p className="text-xs text-muted">Confirme para salvar este Brand DNA como a identidade ativa da sua marca e gerar o primeiro planejamento.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="mx-auto h-8 w-8 animate-pulse text-accent" />
                <p className="mt-3 text-sm font-bold text-ink">A IA está pronta para sintetizar o Brand DNA</p>
                <p className="text-xs text-muted mt-1">Com base nos seus dados e escolhas de objetivo e frequência.</p>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 text-center py-6">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-success">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-ink">Tudo configurado com sucesso!</h3>
              <p className="text-sm text-muted">
                {planSummary?.note || `Seu Brand DNA está ativo e geramos ${planSummary?.count || 5} ideias iniciais no planejamento da semana.`}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-4 text-xs text-muted text-left space-y-1">
              <p className="font-bold text-ink">O que acontece agora:</p>
              <p>• As ideias geradas estão na aba de Planejamento como sugestões (`status: idea`).</p>
              <p>• Você pode aprovar ou editar cada post no Calendário de Aprovações.</p>
              <p>• O Dashboard principal agora está totalmente liberado!</p>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 flex items-center justify-between text-xs text-danger font-semibold">
            <span className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> {error}</span>
            <button type="button" onClick={() => setError(null)} className="underline hover:opacity-80">Fechar</button>
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          {step > 0 && step < 6 ? (
            <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={busy}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          ) : <div />}

          {step === 0 && (
            <Button type="button" onClick={() => go(1)} className="ml-auto">
              Começar configuração automática <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 1 && (
            <Button
              type="button"
              onClick={runStep3Analysis}
              disabled={(!igConnected && !isNewAccountFallback) || (isNewAccountFallback && (!brandNameInput.trim() || !segmentInput.trim()))}
              className="ml-auto"
            >
              Avançar para Análise <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 2 && (
            <Button type="button" onClick={() => go(3)} disabled={!brandNameInput.trim() || !segmentInput.trim()} className="ml-auto">
              Confirmar dados <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button type="button" onClick={() => go(4)} className="ml-auto">
              Continuar com Objetivo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 4 && (
            <Button type="button" onClick={generateAndPreviewDna} disabled={busy} className="ml-auto">
              <Sparkles className="h-4 w-4 mr-1" /> {busy ? 'Sintetizando DNA...' : 'Gerar Brand DNA'}
            </Button>
          )}

          {step === 5 && generatedDna && (
            <Button type="button" onClick={confirmDnaAndGeneratePlan} disabled={busy} className="ml-auto">
              {busy ? 'Gerando ideias de posts...' : 'Aprovar Brand DNA e Planejar'} <Check className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 6 && (
            <Button type="button" onClick={() => router.push('/dashboard')} className="w-full justify-center">
              Ir para o Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/guided-onboarding-wizard.test.js`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/guided/GuidedOnboardingWizard.jsx tests/unit/guided-onboarding-wizard.test.js
git commit -m "feat(onboarding): create GuidedOnboardingWizard component (§6-§24, §27-§33)"
```

---

### Task 5: Rota Dedicada `/onboarding` e Interceptação no `AppShell` (`app/(app)/onboarding/page.jsx`, `components/layout/AppShell.jsx`)

**Files:**
- Create: `app/(app)/onboarding/page.jsx`
- Modify: `components/layout/AppShell.jsx:1-41`
- Create: `tests/unit/app-shell-onboarding.test.js`

**Interfaces:**
- Consumes:
  - `isOnboardingComplete` from `@/lib/onboarding-helpers`
  - `GuidedOnboardingWizard` from `@/components/onboarding/guided/GuidedOnboardingWizard`
- Produces: verificação no `AppShell` que renderiza o assistente em tela cheia se `!isOnboardingComplete(activeBrandKit)`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/app-shell-onboarding.test.js
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/layout/AppShell';

vi.mock('@/components/layout/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar">Sidebar</div> }));
vi.mock('@/components/layout/Topbar', () => ({ Topbar: () => <div data-testid="topbar">Topbar</div> }));
vi.mock('@/components/onboarding/guided/GuidedOnboardingWizard', () => ({
  GuidedOnboardingWizard: () => <div data-testid="guided-wizard">GuidedWizard</div>
}));

describe('AppShell onboarding interceptor', () => {
  it('renderiza GuidedWizard em tela cheia sem Sidebar quando onboarding não está concluído', () => {
    const brand = { id: 'brd-1', name: 'Acme', kit: { onboarding_status: 'in_progress' } };
    render(<AppShell brands={[brand]} activeId="brd-1" activeKit={brand.kit}>Conteúdo</AppShell>);
    expect(screen.getByTestId('guided-wizard')).toBeDefined();
    expect(screen.queryByTestId('sidebar')).toBeNull();
  });

  it('renderiza Sidebar, Topbar e children quando onboarding está concluído', () => {
    const brand = { id: 'brd-1', name: 'Acme', kit: { onboarding_status: 'completed' } };
    render(<AppShell brands={[brand]} activeId="brd-1" activeKit={brand.kit}>Conteúdo</AppShell>);
    expect(screen.getByTestId('sidebar')).toBeDefined();
    expect(screen.getByText('Conteúdo')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/app-shell-onboarding.test.js`  
Expected: FAIL on `activeKit is ignored and sidebar is rendered`

- [ ] **Step 3: Write minimal implementation**

```jsx
// app/(app)/onboarding/page.jsx
import { listBrands, getActiveBrandId } from '@/lib/brands-data';
import { resolveActive } from '@/lib/brands';
import { getBrandKit } from '@/lib/brand-kit-data';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { GuidedOnboardingWizard } from '@/components/onboarding/guided/GuidedOnboardingWizard';

export default async function OnboardingPage() {
  const brands = await listBrands();
  const active = resolveActive(brands, await getActiveBrandId());
  if (!active) return <div className="p-8 text-center text-muted">Crie ou selecione uma marca para iniciar o onboarding.</div>;

  const kit = await getBrandKit(active.id);
  const connectedPlatforms = await listConnectedPlatforms(active.id);

  return (
    <div className="min-h-screen bg-app p-4 sm:p-6 lg:p-8">
      <GuidedOnboardingWizard
        brandId={active.id}
        brandName={active.name}
        kit={kit || {}}
        connectedPlatforms={connectedPlatforms || {}}
      />
    </div>
  );
}
```

```jsx
// components/layout/AppShell.jsx (atualizar para receber activeKit e interceptar se incompleto)
'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { isOnboardingComplete } from '@/lib/onboarding-helpers';
import { GuidedOnboardingWizard } from '@/components/onboarding/guided/GuidedOnboardingWizard';

export function AppShell({ children, brands = [], activeId, activeKit = null, connectedPlatforms = {}, canAccessAICosts = false, accountEmail = '' }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('sidebar-collapsed') === '1'); } catch {}
  }, []);

  function toggleSidebar() {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  const activeBrand = brands.find((b) => b.id === activeId);
  const needsOnboarding = activeId && activeKit && !isOnboardingComplete(activeKit);

  if (needsOnboarding) {
    return (
      <div className="app-glow min-h-screen bg-app overflow-auto p-4 sm:p-6 lg:p-8">
        <GuidedOnboardingWizard
          brandId={activeId}
          brandName={activeBrand?.name || 'Sua Marca'}
          kit={activeKit}
          connectedPlatforms={connectedPlatforms}
        />
      </div>
    );
  }

  return (
    <div className="app-glow flex h-screen">
      <Sidebar collapsed={collapsed} canAccessAICosts={canAccessAICosts} accountEmail={accountEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          brands={brands}
          activeId={activeId}
          canAccessAICosts={canAccessAICosts}
          accountEmail={accountEmail}
          onToggleSidebar={toggleSidebar}
          collapsed={collapsed}
        />
        <main className="min-h-0 flex-1 overflow-auto bg-app">
          <div className="mx-auto w-full max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/app-shell-onboarding.test.js`  
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/onboarding/page.jsx components/layout/AppShell.jsx tests/unit/app-shell-onboarding.test.js
git commit -m "feat(onboarding): add dedicated route /onboarding and layout interceptor (§4, §34)"
```

---

### Task 6: Reestruturação da Área Avançada no Brand Kit (`components/brand-kit/BrandKitShell.jsx`)

**Files:**
- Modify: `components/brand-kit/BrandKitShell.jsx:1-51`
- Create: `tests/unit/brand-kit-shell-advanced.test.js`

**Interfaces:**
- Consumes: `resetOnboarding` from `@/lib/onboarding-actions`, `BrandKitTabs` from `./BrandKitTabs`, `DnaVersions` from `./DnaVersions`
- Produces: Brand Kit limpo focando na aba avançada ("Melhorar precisão da IA" - §3.2 e §25) sem o wizard antigo de 6 etapas

- [ ] **Step 1: Write the failing test**

```javascript
// tests/unit/brand-kit-shell-advanced.test.js
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandKitShell } from '@/components/brand-kit/BrandKitShell';

vi.mock('@/components/brand-kit/BrandKitTabs', () => ({ BrandKitTabs: () => <div data-testid="kit-tabs">KitTabs</div> }));
vi.mock('@/components/brand-kit/DnaVersions', () => ({ DnaVersions: () => <div data-testid="dna-versions">DnaVersions</div> }));
vi.mock('@/lib/onboarding-actions', () => ({ resetOnboarding: vi.fn(async () => ({ ok: true })) }));

describe('BrandKitShell advanced config', () => {
  it('renderiza o botão Refazer onboarding guiado e as abas avançadas', () => {
    render(<BrandKitShell brandId="brd-1" brandName="Acme" brandColor="#007AFF" kit={{ onboarding_status: 'completed' }} versions={[]} />);
    expect(screen.getByText(/Refazer onboarding guiado/i)).toBeDefined();
    expect(screen.getByTestId('kit-tabs')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/brand-kit-shell-advanced.test.js`  
Expected: FAIL on text mismatch or old wizard trigger

- [ ] **Step 3: Write minimal implementation**

```jsx
// components/brand-kit/BrandKitShell.jsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Sparkles } from 'lucide-react';
import { BrandKitTabs } from './BrandKitTabs';
import { DnaVersions } from './DnaVersions';
import { Button } from '@/components/ui/Button';
import { resetOnboarding } from '@/lib/onboarding-actions';

export function BrandKitShell({ brandId, brandName, brandColor, kit, versions = [] }) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleResetOnboarding() {
    if (!confirm('Deseja refazer a jornada guiada de onboarding desde o início? Suas configurações manuais serão mantidas.')) return;
    setResetting(true);
    await resetOnboarding({ brandId });
    setResetting(false);
    router.push('/onboarding');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 p-4">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent" /> Configuração Avançada do Brand DNA
          </h2>
          <p className="text-xs text-muted">Ajuste logo, website, manual e regras de marca para melhorar a precisão da IA (§3.2 / §25).</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetOnboarding} disabled={resetting} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> {resetting ? 'Reiniciando...' : 'Refazer onboarding guiado'}
        </Button>
      </div>

      <DnaVersions brandId={brandId} versions={versions} />
      <BrandKitTabs brandId={brandId} brandName={brandName} brandColor={brandColor} kit={kit} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/brand-kit-shell-advanced.test.js`  
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add components/brand-kit/BrandKitShell.jsx tests/unit/brand-kit-shell-advanced.test.js
git commit -m "feat(brand-kit): re-structure shell for advanced config and reset onboarding trigger (§3.2, §25, §26)"
```

---

### Task 7: Verificação Finais e Testes Unitários Completo

**Files:**
- Test: todos os testes de unidade criados anteriormente

- [ ] **Step 1: Executar suite completa de testes unitários relacionados**

Run: `npx vitest run tests/unit/onboarding-helpers.test.js tests/unit/onboarding-actions.test.js tests/unit/guided-options.test.js tests/unit/guided-onboarding-wizard.test.js tests/unit/app-shell-onboarding.test.js tests/unit/brand-kit-shell-advanced.test.js`  
Expected: PASS (todos os testes unitários passando)

- [ ] **Step 2: Commit final de verificação e consolidação do branch**

```bash
git status
git commit --allow-empty -m "chore(onboarding): finalize implementation plan and validation check (§35)"
```

## Self-Review

1. **Spec Coverage:**
   - Onboarding básico em 7 etapas sem logo/website/manual (§3.1, §5-§24): cobrido nas Tasks 3 e 4.
   - Configuração avançada no Brand Kit (`Melhorar precisão da IA` - §3.2, §25, §26): cobrido na Task 6.
   - Regra de entrada e bloqueio no layout principal (`AppShell` - §4, §34): cobrido na Task 5.
   - Classificação de dados (`CONFIRMED`, `INFERRED`, `NOT_FOUND` - §9) e prioridades (§13, §16): cobrido na Task 1 e 4.
   - Salvamento automático a cada passo e retomada exata (`saveOnboardingProgress` - §28-§30): cobrido na Task 2 e 4.
2. **No Placeholders:** Todos os arquivos de helpers, actions, opções e componentes possuem blocos de código com implementação e verificação Vitest completas.
3. **Type Consistency:** As props de `kit` e `connectedPlatforms` fluem de modo compatível entre `AppShell`, `/onboarding` e `GuidedOnboardingWizard`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-onboarding-jornada-guiada.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration (`superpowers:subagent-driven-development`).
2. **Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
