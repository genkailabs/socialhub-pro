# Brand DNA AI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gerar um Brand DNA confiável por marca a partir de fontes fornecidas/oficiais, persistir em `brand_kits`, usar automaticamente em toda geração, e aprender por sinais leves — com Google Gemini 2.5 Flash como provider único (substitui DeepSeek + deapi).

**Architecture:** Módulos puros testáveis (vitest) para toda lógica sem I/O (pricing, ranking de legendas, html→texto, prompt das 6 lentes, normalização do DNA + relatório com confiança). Clientes de rede (Gemini texto/imagem, coleta IG/site) são finos e sem unit test, espelhando o padrão atual de `deepseek.js`/`generate.js`. UI toda dentro de `/brand-kit` com abas (Análise + Editor). Coleta e persistência reusam Graph API (`lib/meta/graph.js`), `social_tokens`, `brand_kits`, `generation_jobs`.

**Tech Stack:** Next.js 14 (App Router, Server Actions), Supabase (Postgres + RLS + Storage), vitest, Radix Tabs, Google Generative Language API (Gemini 2.5 Flash + Gemini 2.5 Flash Image).

**Design de referência:** `docs/superpowers/specs/2026-07-13-brand-dna-ai-design.md`

**Convenções do repo (LER antes de começar):**
- Alias `@/` = raiz. Testes em `tests/unit/*.test.js`, rodar `npm test`.
- Módulos server-only começam com `import 'server-only';`.
- Custo real sempre logado em `generation_jobs` (núcleo honesto — sem mock).
- Português nos textos de UI e comentários curtos.

**⚠️ Verificação de provider (fazer na Task 2, antes de codar cliente):** confirmar na doc vigente do Google os IDs/rotas de:
- Texto: `models/gemini-2.5-flash:generateContent` (base `https://generativelanguage.googleapis.com/v1beta`).
- Imagem: modelo de imagem do Gemini ("nano-banana", ex. `gemini-2.5-flash-image`) e o `generationConfig.responseModalities`.
Ajustar constantes se os nomes mudaram. Env: `GEMINI_API_KEY`.

---

## Fase 0 — Preparação

### Task 0: Branch e baseline verde

**Step 1:** Confirmar branch de trabalho (worktree). Se em `main`/`rewrite/nextjs`, criar branch:
```bash
git checkout -b feat/brand-dna-ai
```

**Step 2:** Rodar a suíte pra garantir baseline verde.
Run: `npm test`
Expected: PASS (todos os testes atuais passam).

**Step 3:** Adicionar `GEMINI_API_KEY=` ao `.env.example` (documentar; sem valor).
- Modify: `.env.example`

**Step 4:** Commit.
```bash
git add .env.example
git commit -m "chore(ai): documentar GEMINI_API_KEY no .env.example"
```

---

## Fase A — Provider Gemini (texto + imagem)

### Task A1: Pricing do Gemini (pura, TDD)

**Files:**
- Modify: `lib/ai/cost.js`
- Test: `tests/unit/ai.test.js`

**Step 1: Escrever teste que falha**
```js
// em tests/unit/ai.test.js — novo import no topo:
// import { estimateCostUsd, formatUsd, deapiImageCostUsd, geminiImageCostUsd } from '@/lib/ai/cost';

describe('geminiPricing', () => {
  it('calcula texto Gemini por tokens', () => {
    const c = estimateCostUsd('gemini-2.5-flash', { prompt_tokens: 1_000_000, completion_tokens: 0 });
    expect(c).toBeCloseTo(0.30, 5); // ajuste conforme tabela vigente
  });
  it('imagem Gemini multiplica pelo nº', () => {
    expect(geminiImageCostUsd(0)).toBe(0);
    expect(geminiImageCostUsd(4)).toBeCloseTo(geminiImageCostUsd(1) * 4, 6);
  });
});
```

**Step 2: Rodar e ver falhar**
Run: `npm test`
Expected: FAIL (`gemini-2.5-flash` cai no fallback errado; `geminiImageCostUsd` não existe).

**Step 3: Implementar**
Em `lib/ai/cost.js`, adicionar ao objeto de pricing e nova função (preços aproximados — comentar p/ ajustar):
```js
// acrescentar entradas ao mapa de pricing (renomear DEEPSEEK_PRICING p/ AI_PRICING
// ou adicionar as chaves Gemini ao mesmo mapa):
export const AI_PRICING = {
  'deepseek-v4-flash': { inPerM: 0.14, outPerM: 0.28 },
  'deepseek-v4-pro':   { inPerM: 0.435, outPerM: 0.87 },
  'deepseek-chat':     { inPerM: 0.14, outPerM: 0.28 },
  // Gemini 2.5 Flash — preços aproximados (USD/M tokens); ajustar à tabela vigente.
  'gemini-2.5-flash':  { inPerM: 0.30, outPerM: 2.50 }
};
// manter export const DEEPSEEK_PRICING = AI_PRICING; (retrocompat com testes/imports)

// custo por imagem Gemini (USD) — aproximado; ajustar por env.
export const GEMINI_IMAGE_USD = Number(process.env.GEMINI_IMAGE_USD) || 0.039;
export function geminiImageCostUsd(n = 1) {
  const count = Math.max(0, Number(n) || 0);
  return Math.round(count * GEMINI_IMAGE_USD * 1e6) / 1e6;
}
```
Ajustar `estimateCostUsd` p/ usar `AI_PRICING` no lookup (fallback mantém `deepseek-v4-flash`? Não — fallback agora deve ser `gemini-2.5-flash` já que é o provider padrão. **Atenção:** o teste existente `modelo desconhecido usa fallback` espera 1.10 (= 0.28 out ×... na verdade 1.1 vem de outPerM antigo). Verificar: teste antigo usa `completion_tokens: 1_000_000` → 1.10 exige `outPerM` do fallback = 1.10. Nenhum modelo tem 1.10. Reler: fallback = `deepseek-v4-flash` outPerM 0.28 → daria 0.28, não 1.10. Então esse teste já assume outro fallback? **Rodar o teste atual antes** pra ver o valor real e não quebrar. Se necessário, atualizar o teste de fallback junto com a mudança, documentando no commit.)

**Step 4: Rodar e ver passar**
Run: `npm test`
Expected: PASS (novos + existentes; ajustar teste de fallback se a mudança de modelo padrão exigir).

**Step 5: Commit**
```bash
git add lib/ai/cost.js tests/unit/ai.test.js
git commit -m "feat(ai): pricing Gemini 2.5 Flash (texto + imagem) no cost.js"
```

---

### Task A2: Cliente de texto Gemini (I/O)

**Files:**
- Create: `lib/ai/gemini.js`

**Step 1: Implementar** (espelha `deepseek.js`; JSON mode; usage normalizado p/ `{prompt_tokens, completion_tokens}` p/ reusar `estimateCostUsd`)
```js
import 'server-only';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Cliente mínimo do Gemini (texto). Server-side. Retorna no MESMO formato do
// deepseekChat: { content, usage:{prompt_tokens, completion_tokens}, model }.
export async function geminiChat({ system, user, model = 'gemini-2.5-flash', temperature = 0.9, jsonMode = true }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não configurada no servidor.');

  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {})
      }
    }),
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Gemini: ${data.error?.message || res.statusText || 'falha na chamada'}`);
  }
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  const um = data.usageMetadata || {};
  return {
    content,
    usage: { prompt_tokens: um.promptTokenCount || 0, completion_tokens: um.candidatesTokenCount || 0 },
    model
  };
}
```

**Step 2: Smoke manual** (não há unit test de I/O). Criar script temporário e rodar com a key:
```bash
node -e "require('dotenv').config({path:'.env.local'}); import('./lib/ai/gemini.js').then(async m=>{const r=await m.geminiChat({system:'Responda JSON {\"ok\":true}',user:'diga ok',jsonMode:true});console.log(r.content, r.usage)})"
```
Expected: imprime JSON + usage com tokens > 0. (Se falhar por ESM/path, testar via rota dev na Task C.)

**Step 3: Commit**
```bash
git add lib/ai/gemini.js
git commit -m "feat(ai): cliente de texto Gemini 2.5 Flash (formato compat)"
```

---

### Task A3: Cliente de imagem Gemini (I/O)

**Files:**
- Create: `lib/ai/gemini-image.js`

**Step 1: Implementar** (retorna bytes prontos p/ storage, igual `deapiGenerateImage`)
```js
import 'server-only';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export function hasGeminiKey() {
  const k = process.env.GEMINI_API_KEY;
  return typeof k === 'string' && k.trim().length > 0;
}

// Gera 1 imagem a partir de prompt e devolve { bytes, contentType, model }.
export async function geminiGenerateImage({ prompt, model = GEMINI_IMAGE_MODEL }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não configurada no servidor.');
  if (!prompt || !String(prompt).trim()) throw new Error('Gemini: prompt de imagem vazio.');

  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: String(prompt) }] }],
      generationConfig: { responseModalities: ['IMAGE'] }
    }),
    cache: 'no-store'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Gemini imagem: ${data.error?.message || res.statusText || 'falha'}`);

  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error('Gemini imagem: resposta sem imagem.');
  return {
    bytes: Buffer.from(img.inlineData.data, 'base64'),
    contentType: img.inlineData.mimeType || 'image/png',
    model
  };
}
```
**⚠️** Confirmar `responseModalities` e model id na doc vigente (ver aviso do topo).

**Step 2: Smoke** via rota dev na Task C (o render real valida). Sem unit test.

**Step 3: Commit**
```bash
git add lib/ai/gemini-image.js
git commit -m "feat(ai): cliente de imagem Gemini (nano-banana)"
```

---

### Task A4: Migrar `generateCreative` p/ Gemini

**Files:**
- Modify: `lib/ai/generate.js`
- Modify: `lib/ai-actions.js:26-40` (log de custo: provider 'gemini')

**Step 1:** Em `generate.js`, trocar imports e chamadas:
- `deepseekChat` → `geminiChat` (de `@/lib/ai/gemini`).
- Imagem: preferir `geminiGenerateImage` (de `@/lib/ai/gemini-image`) quando `hasGeminiKey()`; **fallback mantém** o render on-brand `next/og` (custo zero) se a imagem falhar/sem key.
- Custo: `imageCost = useGemini ? geminiImageCostUsd(n) : 0` (import de `@/lib/ai/cost`).
- `imageProvider` = `'gemini' | 'render'`.

**Step 2:** Em `lib/ai-actions.js`, ajustar o log: `provider: 'gemini'`, e o ramo de imagem `if (gen.imageProvider === 'gemini')` grava a linha `kind:'image', provider:'gemini'`. No `catch`, `model: 'gemini-2.5-flash'`.

**Step 3:** Rodar testes (as funções puras não mudam de contrato).
Run: `npm test`
Expected: PASS.

**Step 4:** Verificação real ponta-a-ponta na Task C.5 (AI Studio gera post via Gemini). Não remover deapi ainda (Task E).

**Step 5: Commit**
```bash
git add lib/ai/generate.js lib/ai-actions.js
git commit -m "feat(ai): geração usa Gemini (texto + imagem), render on-brand como fallback"
```

---

## Fase B — Dados e análise do Brand DNA

### Task B1: Migração — estende `brand_kits` + `dna_signals`

**Files:**
- Create: `supabase/migrations/20260713_brand_dna.sql`

**Step 1: Escrever a migração**
```sql
-- Brand DNA AI: estende brand_kits + sinais de aprendizado
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS personality      TEXT[] DEFAULT '{}';
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS emotions         TEXT[] DEFAULT '{}';
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS formality        TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS emoji_usage      TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS cta_policy       TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS storytelling     BOOLEAN;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS visual_style     TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS caption_length   TEXT;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS dna_report       JSONB;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS dna_sources      JSONB;
ALTER TABLE public.brand_kits ADD COLUMN IF NOT EXISTS dna_generated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.dna_signals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  post_id    UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  action     TEXT NOT NULL CHECK (action IN ('approve','reject','edit')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dna_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dna_signals_brand ON public.dna_signals (brand_id, created_at DESC);
DROP POLICY IF EXISTS "dna_signals_owner_all" ON public.dna_signals;
CREATE POLICY "dna_signals_owner_all" ON public.dna_signals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = dna_signals.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = dna_signals.brand_id AND b.user_id = auth.uid()));
```

**Step 2: Aplicar no Supabase.** Conforme [[ai-content-engine]], `db push` está dessincronizado — aplicar via **SQL Editor** do projeto (ver [[supabase-account]]; confirmar projeto antes). Colar o SQL e executar.
Expected: colunas e tabela criadas sem erro.

**Step 3: Commit**
```bash
git add supabase/migrations/20260713_brand_dna.sql
git commit -m "feat(db): estende brand_kits (Brand DNA) + tabela dna_signals"
```

---

### Task B2: Ranking de legendas relevantes (pura, TDD)

**Files:**
- Create: `lib/ai/dna/captions.js`
- Test: `tests/unit/dna.test.js`

**Step 1: Teste que falha**
```js
import { describe, it, expect } from 'vitest';
import { pickRelevantCaptions } from '@/lib/ai/dna/captions';

describe('pickRelevantCaptions', () => {
  it('descarta vazias e ordena por tamanho/densidade, limita a N', () => {
    const media = [
      { caption: '' },
      { caption: 'oi' },
      { caption: 'Legenda longa e rica com dicas e chamada para ação clara aqui.' },
      { caption: 'Promoção! 🔥 link na bio' }
    ];
    const out = pickRelevantCaptions(media, 2);
    expect(out.length).toBe(2);
    expect(out[0]).toContain('Legenda longa');
    expect(out.every((c) => c.trim().length > 0)).toBe(true);
  });
  it('lida com lista vazia', () => {
    expect(pickRelevantCaptions([], 12)).toEqual([]);
  });
});
```

**Step 2: Rodar e ver falhar**
Run: `npm test tests/unit/dna.test.js`
Expected: FAIL (módulo não existe).

**Step 3: Implementar**
```js
// Seleciona as legendas mais "relevantes" (não vazias, mais informativas) e limita a N.
// Heurística simples: pontua por comprimento e presença de sinais (CTA, hashtag, emoji).
export function pickRelevantCaptions(media = [], n = 12) {
  const score = (c) => {
    const t = String(c || '').trim();
    if (!t) return -1;
    let s = Math.min(t.length, 500);
    if (/#\w+/.test(t)) s += 30;
    if (/(link na bio|clique|acesse|compre|saiba mais|garanta|aproveite)/i.test(t)) s += 40;
    return s;
  };
  return media
    .map((m) => (typeof m === 'string' ? m : m?.caption))
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(0, n))
    .map((x) => x.c);
}
```

**Step 4: Rodar e ver passar**
Run: `npm test tests/unit/dna.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add lib/ai/dna/captions.js tests/unit/dna.test.js
git commit -m "feat(dna): ranking de legendas relevantes do IG"
```

---

### Task B3: HTML do site → texto limpo + truncagem (pura, TDD)

**Files:**
- Create: `lib/ai/dna/website.js`
- Test: `tests/unit/dna.test.js` (append)

**Step 1: Teste que falha**
```js
import { htmlToText } from '@/lib/ai/dna/website';

describe('htmlToText', () => {
  it('remove tags/script/style e colapsa espaços', () => {
    const html = '<html><head><style>a{}</style><script>x()</script></head><body><h1>Missão</h1><p>Café  especial</p></body></html>';
    const t = htmlToText(html, 1000);
    expect(t).toContain('Missão');
    expect(t).toContain('Café especial');
    expect(t).not.toContain('x()');
  });
  it('trunca no limite', () => {
    expect(htmlToText('<p>' + 'a'.repeat(500) + '</p>', 100).length).toBeLessThanOrEqual(100);
  });
});
```

**Step 2:** Run `npm test tests/unit/dna.test.js` → FAIL.

**Step 3: Implementar**
```js
// Extrai texto legível de HTML (sem lib externa). Server e teste-friendly.
export function htmlToText(html, limit = 8000) {
  const noScript = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return noScript.slice(0, Math.max(0, limit));
}
```

**Step 4:** Run `npm test tests/unit/dna.test.js` → PASS.

**Step 5: Commit**
```bash
git add lib/ai/dna/website.js tests/unit/dna.test.js
git commit -m "feat(dna): extração de texto de HTML do site"
```

---

### Task B4: Prompt das 6 lentes (pura, TDD)

**Files:**
- Create: `lib/ai/dna/prompt.js`
- Test: `tests/unit/dna.test.js` (append)

**Step 1: Teste que falha**
```js
import { buildDnaPrompt } from '@/lib/ai/dna/prompt';

describe('buildDnaPrompt', () => {
  it('system tem as 6 lentes e pede JSON; user injeta fontes', () => {
    const { system, user } = buildDnaPrompt({
      brandName: 'Café X',
      sources: { manual: { tone: 'acolhedor' }, ig: { bio: 'o melhor café', captions: ['dica 1'] }, website: 'missão: café', pasted: 'briefing' }
    });
    for (const lente of ['Branding', 'Instagram', 'Copywriting', 'Design', 'Growth', 'Concorrência']) {
      expect(system).toContain(lente);
    }
    expect(system.toLowerCase()).toContain('json');
    expect(system).toContain('confidence');
    expect(user).toContain('Café X');
    expect(user).toContain('o melhor café');
  });
});
```

**Step 2:** Run → FAIL.

**Step 3: Implementar** (o SYSTEM destila o conhecimento das skills de marketing como lentes; retorna JSON com `dna` + `report`)
```js
// Prompt do Brand DNA: 1 chamada Gemini com 6 lentes destiladas no system.
const SYSTEM = `Você é um comitê de especialistas de marca brasileiro. Analise a marca SOMENTE com base nas fontes fornecidas — não invente fatos. Aplique estas 6 lentes:
- Branding: tom de voz, personalidade, emoções, posicionamento, formalidade.
- Instagram: padrão de bio/legendas, uso de CTA, hashtags, emojis, storytelling, frequência aparente.
- Copywriting: qualidade de títulos e legendas, clareza, chamada para ação.
- Design: estilo visual declarado, paleta, consistência (sem análise de pixel).
- Growth: oportunidades de alcance/engajamento visíveis nas fontes.
- Concorrência: só se houver dados; senão marque como não avaliado.

Responda SEMPRE com um único JSON válido, sem texto fora do JSON:
{"dna":{"tone":"","personality":[""],"emotions":[""],"formality":"baixa|média|alta","emoji_usage":"nunca|poucos|muitos","cta_policy":"sempre|só vendas|nunca","storytelling":true,"visual_style":"premium|moderno|minimalista|criativo","caption_length":"curta|média|longa","pillars":[""],"audience":"","niche":""},
"report":{"disclaimer":"Avaliação qualitativa da IA baseada nas fontes analisadas. Não são métricas oficiais do Instagram.","overall":0.0,"categories":[{"key":"branding|instagram|copy|design|growth|competitor","score":0.0,"confidence":"alta|média|baixa","basis":""}],"strengths":[""],"weaknesses":[""],"opportunities":[""]}}
Regras: notas 0–10 com base explícita ("basis"); confidence reflete o volume/qualidade de evidência da fonte; só pontue o que viu; português do Brasil.`;

export function buildDnaPrompt({ brandName, sources = {} } = {}) {
  const { manual = {}, ig, website, pasted } = sources;
  const parts = [`Marca: ${brandName || '—'}`, ''];

  parts.push('== Criador manual (declarado pelo usuário) ==');
  parts.push(JSON.stringify(manual || {}, null, 0));

  parts.push('', '== Instagram próprio ==');
  if (ig) {
    parts.push(`Bio: ${ig.bio || '—'}`);
    parts.push('Legendas recentes:');
    (ig.captions || []).forEach((c, i) => parts.push(`${i + 1}. ${c}`));
  } else parts.push('Não analisado (sem conexão/erro).');

  parts.push('', '== Website ==', website ? website : 'Não analisado.');
  parts.push('', '== Texto colado ==', pasted ? pasted : 'Não fornecido.');

  return { system: SYSTEM, user: parts.join('\n') };
}
```

**Step 4:** Run → PASS.

**Step 5: Commit**
```bash
git add lib/ai/dna/prompt.js tests/unit/dna.test.js
git commit -m "feat(dna): prompt das 6 lentes p/ o Gemini"
```

---

### Task B5: Normalização do DNA + relatório com confiança (pura, TDD)

**Files:**
- Create: `lib/ai/dna/normalize.js`
- Test: `tests/unit/dna.test.js` (append)

**Step 1: Teste que falha**
```js
import { normalizeDnaResult } from '@/lib/ai/dna/normalize';

describe('normalizeDnaResult', () => {
  it('parseia JSON e garante disclaimer + clamp de notas', () => {
    const raw = JSON.stringify({ dna: { tone: 'x', formality: 'alta' }, report: { overall: 99, categories: [{ key: 'branding', score: 12, confidence: 'alta', basis: 'ok' }] } });
    const out = normalizeDnaResult(raw, { hasIg: false });
    expect(out.dna.tone).toBe('x');
    expect(out.report.overall).toBeLessThanOrEqual(10);
    expect(out.report.categories[0].score).toBeLessThanOrEqual(10);
    expect(out.report.disclaimer).toMatch(/qualitativa/i);
  });
  it('sem IG rebaixa confiança de categorias dependentes de feed', () => {
    const raw = JSON.stringify({ dna: {}, report: { categories: [{ key: 'instagram', score: 8, confidence: 'alta', basis: '' }] } });
    const out = normalizeDnaResult(raw, { hasIg: false });
    expect(out.report.categories[0].confidence).toBe('baixa');
  });
  it('JSON inválido lança', () => {
    expect(() => normalizeDnaResult('nope', {})).toThrow();
  });
});
```

**Step 2:** Run → FAIL.

**Step 3: Implementar**
```js
const clamp10 = (v) => Math.max(0, Math.min(10, Number(v) || 0));
const DISCLAIMER = 'Avaliação qualitativa da IA baseada nas fontes analisadas. Não são métricas oficiais do Instagram.';
const FEED_DEPENDENT = new Set(['instagram', 'design']);

export function normalizeDnaResult(content, ctx = {}) {
  let obj;
  try { obj = typeof content === 'string' ? JSON.parse(content) : content; }
  catch { throw new Error('Resposta do Gemini não é JSON válido.'); }
  if (!obj || typeof obj !== 'object') throw new Error('Resposta do Gemini vazia.');

  const dna = obj.dna || {};
  const rep = obj.report || {};
  const categories = Array.isArray(rep.categories) ? rep.categories.map((c) => {
    let confidence = ['alta', 'média', 'baixa'].includes(c.confidence) ? c.confidence : 'baixa';
    if (!ctx.hasIg && FEED_DEPENDENT.has(c.key)) confidence = 'baixa';
    return { key: String(c.key || ''), score: clamp10(c.score), confidence, basis: String(c.basis || '') };
  }) : [];

  return {
    dna,
    report: {
      disclaimer: DISCLAIMER,
      overall: clamp10(rep.overall),
      categories,
      strengths: Array.isArray(rep.strengths) ? rep.strengths.map(String) : [],
      weaknesses: Array.isArray(rep.weaknesses) ? rep.weaknesses.map(String) : [],
      opportunities: Array.isArray(rep.opportunities) ? rep.opportunities.map(String) : []
    }
  };
}
```

**Step 4:** Run → PASS.

**Step 5: Commit**
```bash
git add lib/ai/dna/normalize.js tests/unit/dna.test.js
git commit -m "feat(dna): normalização do DNA + relatório (clamp, disclaimer, confiança)"
```

---

### Task B6: Coleta de fontes (I/O)

**Files:**
- Create: `lib/ai/dna/collect.js`

**Step 1: Implementar** (reusa Graph API; site via fetch; degrada com elegância)
```js
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfile, fetchInstagramMedia } from '@/lib/meta/graph';
import { pickRelevantCaptions } from '@/lib/ai/dna/captions';
import { htmlToText } from '@/lib/ai/dna/website';

// Coleta bio + 12 legendas relevantes do IG próprio (ou null se sem token/erro).
async function collectInstagram(brandId, supabase) {
  const { data: token } = await supabase.from('social_tokens')
    .select('access_token, platform_user_id')
    .eq('brand_id', brandId).eq('platform', 'instagram').eq('is_active', true).maybeSingle();
  if (!token) return null;
  try {
    const profile = await fetchInstagramProfile(token.platform_user_id, token.access_token);
    const media = await fetchInstagramMedia(token.platform_user_id, token.access_token, 15);
    return { bio: profile.biography || '', captions: pickRelevantCaptions(media, 12) };
  } catch { return null; }
}

async function collectWebsite(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) return null;
    return htmlToText(await res.text(), 8000);
  } catch { return null; }
}

// Monta o objeto `sources` p/ buildDnaPrompt.
export async function collectSources({ brandId, wantIg, websiteUrl, pastedText, manual }) {
  const supabase = await createClient();
  const [ig, website] = await Promise.all([
    wantIg ? collectInstagram(brandId, supabase) : Promise.resolve(null),
    collectWebsite(websiteUrl)
  ]);
  return {
    sources: { manual: manual || {}, ig, website, pasted: (pastedText || '').slice(0, 8000) || null },
    meta: { hasIg: !!ig, hasWebsite: !!website, hasPasted: !!pastedText }
  };
}
```

**Step 2: Commit**
```bash
git add lib/ai/dna/collect.js
git commit -m "feat(dna): coleta de fontes (IG próprio + site + texto)"
```

---

### Task B7: Server action `analyzeBrandDNA` (I/O)

**Files:**
- Create: `lib/dna-actions.js`

**Step 1: Implementar**
```js
'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { collectSources } from '@/lib/ai/dna/collect';
import { buildDnaPrompt } from '@/lib/ai/dna/prompt';
import { normalizeDnaResult } from '@/lib/ai/dna/normalize';
import { geminiChat } from '@/lib/ai/gemini';
import { estimateCostUsd } from '@/lib/ai/cost';

export async function analyzeBrandDNA({ brandId, brandName, wantIg, websiteUrl, pastedText, manual }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  try {
    const { sources, meta } = await collectSources({ brandId, wantIg, websiteUrl, pastedText, manual });
    const { system, user: userPrompt } = buildDnaPrompt({ brandName, sources });
    const out = await geminiChat({ system, user: userPrompt, jsonMode: true });
    const result = normalizeDnaResult(out.content, { hasIg: meta.hasIg });

    const cost = estimateCostUsd(out.model, out.usage);
    const dnaSources = { ...meta, at: new Date().toISOString() };

    // persiste DNA no brand_kits (merge dos campos gerados) + relatório
    const row = {
      brand_id: brandId,
      ...pickDnaColumns(result.dna),
      dna_report: result.report,
      dna_sources: dnaSources,
      dna_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });

    await supabase.from('generation_jobs').insert({
      brand_id: brandId, kind: 'brand_dna', provider: 'gemini', model: out.model,
      input_tokens: out.usage.prompt_tokens, output_tokens: out.usage.completion_tokens,
      cost_usd: cost, status: 'success'
    });

    revalidatePath('/brand-kit');
    return { ok: true, dna: result.dna, report: result.report, sources: dnaSources, cost };
  } catch (e) {
    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId, kind: 'brand_dna', provider: 'gemini', model: 'gemini-2.5-flash',
        status: 'error', error: String(e.message).slice(0, 500)
      });
    } catch {}
    return { error: e.message };
  }
}

// só as colunas conhecidas do brand_kits (evita gravar chave inválida)
function pickDnaColumns(dna = {}) {
  const keys = ['niche','audience','tone','pillars','personality','emotions','formality','emoji_usage','cta_policy','storytelling','visual_style','caption_length'];
  const out = {};
  for (const k of keys) if (dna[k] !== undefined && dna[k] !== null) out[k] = dna[k];
  return out;
}
```

**Step 2:** `generation_jobs.kind` já é TEXT livre → `'brand_dna'` OK (sem CHECK). Confirmar no schema (migração 20260712 não restringe `kind`).

**Step 3: Commit**
```bash
git add lib/dna-actions.js
git commit -m "feat(dna): server action analyzeBrandDNA (coleta → Gemini → persiste + log)"
```

---

## Fase C — UI dentro de `/brand-kit`

### Task C1: `saveBrandKit` aceita campos novos

**Files:**
- Modify: `lib/brand-kit-actions.js`

**Step 1:** Estender `saveBrandKit` p/ persistir os campos novos (todos opcionais): `personality`, `emotions` (arrays via `toArr`), `formality`, `emoji_usage`, `cta_policy`, `storytelling` (bool), `visual_style`, `caption_length`. Manter os existentes. Só setar coluna quando o campo vier definido (não sobrescrever DNA gerado com vazio).

**Step 2:** Rodar testes.
Run: `npm test`
Expected: PASS (sem testes tocando essa action; sem regressão).

**Step 3: Commit**
```bash
git add lib/brand-kit-actions.js
git commit -m "feat(brand-kit): saveBrandKit persiste campos do Brand DNA"
```

---

### Task C2: Extração de cor da logo (client, pura-ish)

**Files:**
- Create: `lib/color/dominant.js`
- Test: `tests/unit/color.test.js`

**Step 1: Teste que falha** (testar o quantizador puro, não o canvas)
```js
import { describe, it, expect } from 'vitest';
import { dominantHexFromPixels } from '@/lib/color/dominant';

describe('dominantHexFromPixels', () => {
  it('acha a cor mais frequente (ignora quase-transparente)', () => {
    // RGBA planos: 2 px vermelhos opacos, 1 azul opaco, 1 transparente
    const px = new Uint8ClampedArray([255,0,0,255, 255,0,0,255, 0,0,255,255, 0,0,0,0]);
    expect(dominantHexFromPixels(px)).toBe('#ff0000');
  });
});
```

**Step 2:** Run `npm test tests/unit/color.test.js` → FAIL.

**Step 3: Implementar** (quantização por bucket; função de canvas separada, sem teste)
```js
// Cor dominante a partir de pixels RGBA (Uint8ClampedArray). Puro/testável.
export function dominantHexFromPixels(data, step = 4) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a < 200) continue; // ignora transparente
    const r = data[i] & 0xf0, g = data[i + 1] & 0xf0, b = data[i + 2] & 0xf0;
    const key = (r << 16) | (g << 8) | b;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  let best = 0, bestKey = 0;
  for (const [k, v] of buckets) if (v > best) { best = v; bestKey = k; }
  const r = (bestKey >> 16) & 0xff, g = (bestKey >> 8) & 0xff, b = bestKey & 0xff;
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Browser: carrega imagem em canvas e devolve a cor dominante. Sem unit test.
export async function dominantColorFromImageUrl(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const canvas = document.createElement('canvas');
  const w = canvas.width = Math.min(img.naturalWidth, 128);
  const h = canvas.height = Math.min(img.naturalHeight, 128);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return dominantHexFromPixels(ctx.getImageData(0, 0, w, h).data);
}
```

**Step 4:** Run → PASS.

**Step 5: Commit**
```bash
git add lib/color/dominant.js tests/unit/color.test.js
git commit -m "feat(brand-kit): extração de cor dominante da logo (client canvas + quantizador puro)"
```

---

### Task C3: Componente do relatório

**Files:**
- Create: `components/brand-kit/DnaReport.jsx`

**Step 1: Implementar** (apresentação pura; recebe `report`): nota geral, cards por categoria com nota + badge de confiança (`alta`=verde, `média`=âmbar, `baixa`=cinza) + `basis`, listas de forças/fraquezas/oportunidades, `disclaimer` em rodapé menor. Usar classes já vistas (`text-ink`, `text-muted`, `border-line`, `bg-surface`, `text-success`, `text-danger`).

**Step 2: Commit**
```bash
git add components/brand-kit/DnaReport.jsx
git commit -m "feat(brand-kit): componente de relatório do Brand DNA"
```

---

### Task C4: Painel de análise + abas na página

**Files:**
- Create: `components/brand-kit/DnaAnalyzer.jsx` (client)
- Modify: `components/brand-kit/BrandKitForm.jsx` (novos campos do DNA)
- Modify: `app/(app)/brand-kit/page.jsx` (abas Radix: Análise + Editor)

**Step 1: `DnaAnalyzer.jsx`** — toggles (IG / site / texto) + inputs (URL do site, textarea de texto colado) + botão "Gerar Brand DNA" chamando `analyzeBrandDNA({ brandId, brandName, wantIg, websiteUrl, pastedText, manual: kit })`. Loading real; ao voltar, renderiza `<DnaReport report={res.report} />` e avisa "DNA salvo — edite na aba ao lado". Erros exibidos.

**Step 2: `BrandKitForm.jsx`** — adicionar campos: personality, emotions (textarea linhas), formality/emoji_usage/cta_policy/visual_style/caption_length (selects), storytelling (checkbox). Ligar logo→cor: ao informar `logoUrl`, botão "Extrair cor" usa `dominantColorFromImageUrl` e seta `palette.accent`. Enviar tudo no `saveBrandKit`.

**Step 3: `page.jsx`** — usar `@radix-ui/react-tabs` (já instalado): aba **Análise** (`<DnaAnalyzer>`, mostra relatório salvo `kit?.dna_report` se existir) e aba **Editor** (`<BrandKitForm>`). Selo "DNA usado automaticamente na geração".

**Step 4: Verificação (dev):**
Run: `npm run dev` e abrir `/brand-kit`. Conferir abas, gerar DNA com texto colado (sem IG), ver relatório com disclaimer/confiança, salvar edição.
Expected: DNA gerado e persistido; recarregar mantém.

**Step 5: Commit**
```bash
git add components/brand-kit/DnaAnalyzer.jsx components/brand-kit/BrandKitForm.jsx "app/(app)/brand-kit/page.jsx"
git commit -m "feat(brand-kit): abas Análise + Editor com gerador de Brand DNA"
```

---

### Task C5: Verificação ponta-a-ponta do Gemini (geração de post)

**Step 1:** Com `GEMINI_API_KEY` no `.env.local`, abrir AI Studio e gerar um post.
Expected: texto vem do Gemini; imagem vem do Gemini (ou fallback render) e sobe no storage; `generation_jobs` registra custo real com `provider:'gemini'`.

**Step 2:** Conferir `/ai-costs` mostra o custo Gemini.

**Step 3:** Se a imagem Gemini falhar/qualidade ruim, manter fallback render e registrar issue p/ Task E. Nenhum commit (verificação).

---

## Fase D — Uso automático + aprendizado

### Task D1: `buildContentPrompt` usa o DNA completo (pura, TDD)

**Files:**
- Modify: `lib/ai/prompt.js`
- Test: `tests/unit/ai.test.js` (append)

**Step 1: Teste que falha**
```js
it('injeta campos do Brand DNA no user prompt', () => {
  const { user } = buildContentPrompt({
    brandKit: { tone: 'x', personality: ['consultivo'], cta_policy: 'sempre', emoji_usage: 'poucos', storytelling: true, caption_length: 'longa' },
    brief: {}
  });
  expect(user).toContain('consultivo');
  expect(user).toMatch(/CTA|chamada para ação/i);
  expect(user).toMatch(/emoji/i);
});
```

**Step 2:** Run → FAIL.

**Step 3: Implementar** — no `buildContentPrompt`, ler os campos novos do `brandKit` e acrescentar linhas ao `user` (personality, emotions, formality, emoji_usage, cta_policy, storytelling, visual_style, caption_length). Mapear pra instruções claras (ex: `cta_policy:'sempre'` → "Sempre incluir chamada para ação").

**Step 4:** Run → PASS.

**Step 5: Commit**
```bash
git add lib/ai/prompt.js tests/unit/ai.test.js
git commit -m "feat(ai): geração on-brand usa o Brand DNA completo"
```

---

### Task D2: Flag "ignorar DNA" no AI Studio

**Files:**
- Modify: `components/ai/AIStudioPanel.jsx`
- Modify: `lib/ai-actions.js` (aceitar `ignoreDna`; quando true, passar `kit=null` p/ `generateCreative`)

**Step 1:** Checkbox "Ignorar Brand DNA" no painel; passar `ignoreDna` na chamada. Em `generatePost`, se `ignoreDna` → `kit = null`.

**Step 2:** Verificação dev: gerar com/sem DNA e ver diferença no texto. Sem unit test (I/O + UI).

**Step 3: Commit**
```bash
git add components/ai/AIStudioPanel.jsx lib/ai-actions.js
git commit -m "feat(ai): opção de ignorar o Brand DNA na geração (critério PRD)"
```

---

### Task D3: Sinais de aprendizado (approve/reject/edit)

**Files:**
- Create: `lib/dna-signals.js` (helper `recordDnaSignal({ brandId, postId, action })`)
- Modify: `lib/approval-actions.js` (grava sinal ao aprovar/rejeitar)
- Modify: `lib/posts-actions.js` (grava sinal ao editar post gerado)

**Step 1:** Helper server-only que faz insert best-effort em `dna_signals` (não bloqueia o fluxo; try/catch).

**Step 2:** Chamar `recordDnaSignal` nos pontos de aprovar/rejeitar/editar (best-effort). Não alterar comportamento existente.

**Step 3:** Verificação: aprovar um post e conferir linha em `dna_signals`.

**Step 4:** Estender `collectSources`/`buildDnaPrompt` p/ incluir um resumo dos sinais recentes ("histórico de preferência: N aprovados, M rejeitados") no contexto da próxima análise. Manter simples.

**Step 5: Commit**
```bash
git add lib/dna-signals.js lib/approval-actions.js lib/posts-actions.js lib/ai/dna/collect.js lib/ai/dna/prompt.js
git commit -m "feat(dna): registra sinais de aprovar/rejeitar/editar (aprendizado mínimo)"
```

---

## Fase E — Validação e limpeza

### Task E1: Validar imagem Gemini e aposentar deapi

**Pré-condição:** Task C5 confirmou qualidade/custo aceitáveis da imagem Gemini.

**Files:**
- Modify: `lib/ai/generate.js` (remover ramo deapi)
- Delete: `lib/ai/deapi.js`
- Modify: `lib/ai/cost.js` (remover `deapiImageCostUsd`/`DEAPI_IMAGE_USD`) e `tests/unit/ai.test.js` (remover o describe da deapi)
- Modify: `lib/ai-actions.js` (remover ramo `imageProvider==='deapi'`)
- Modify: `.env.example` (remover DEAPI_*)

**Step 1:** Remover referências à deapi; manter fallback render on-brand.

**Step 2:** Run `npm test` → PASS (após remover testes da deapi).

**Step 3:** Verificação dev: geração ainda funciona (Gemini + fallback render).

**Step 4: Commit**
```bash
git add -A
git commit -m "refactor(ai): remove deapi — Gemini é provider único de imagem"
```

> Se a qualidade/custo do Gemini NÃO for aceitável, **pular esta task**: manter deapi como provider de imagem via env e Gemini só p/ texto/análise. Registrar a decisão.

---

### Task E2: Atualizar memória `ai-content-engine`

**Step 1:** Atualizar `~/.claude/projects/H--GERENCIADOR-REDES-SOCIAIS/memory/ai-content-engine.md` refletindo o provider único Gemini (supera a decisão DeepSeek-texto + render/deapi), e marcar a migração `20260713_brand_dna.sql` como aplicada. Ver [[brand-dna-ai-design]].

**Step 2:** Não é código — sem commit no repo.

---

## Critérios de Aceitação (verificar no fim)
- [ ] Analisar 1+ das 4 fontes → Brand DNA consistente, persistido em `brand_kits`.
- [ ] Relatório com forças/fraquezas/oportunidades + notas com base + confiança + disclaimer.
- [ ] Sem IG → confiança rebaixada, sem quebrar.
- [ ] Editar manualmente qualquer atributo do DNA (aba Editor).
- [ ] Geração (AI Studio + Piloto) usa o DNA automaticamente; flag "ignorar DNA" funciona.
- [ ] Sinais de aprovar/rejeitar/editar gravados em `dna_signals`.
- [ ] Provider Gemini funcionando (texto + imagem); custo real em `generation_jobs`.
- [ ] `npm test` verde.

## Ordem de dependências
Fase 0 → A (A1→A4) → B (B1 migração; B2–B5 puras em paralelo; B6→B7) → C (C1, C2 paralelos; C3→C4→C5) → D (D1→D2→D3) → E (E1 após C5 validar; E2).
```
