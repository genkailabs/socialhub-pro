# Gerador de Imagem de Notícia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o Composer gere quatro imagens de alta qualidade ligadas ao tema da notícia, selecione uma e aplique um título opcional na arte antes de publicar.

**Architecture:** A criação de texto continua com DeepSeek, mas a imagem deixa de ser gerada junto com a primeira ideia. Um novo fluxo usa Gemini para quatro variações visuais sem texto e salva cada uma no bucket de mídia. A composição do título acontece no servidor sobre a imagem escolhida, preservando a imagem sem texto quando o controle estiver desligado.

**Tech Stack:** Next.js 14 App Router, Server Actions, Supabase Storage, Gemini Image, `next/og` ImageResponse, React, Vitest e Tailwind CSS.

## Global Constraints

- Usar Gemini como gerador de imagem de notícia; `GEMINI_API_KEY` já está presente localmente e no Railway.
- Gerar exatamente quatro opções quadradas, sem letras, sem texto e sem marca d'água.
- Manter a publicação, rascunho, agendamento e aprovação existentes.
- Aplicar o título somente por composição do SocialHub, nunca pedindo texto ao modelo de imagem.
- Não alterar arquivos locais não relacionados ao gerador.

---

### Task 1: Construir o contrato do gerador de notícia

**Files:**
- Create: `lib/ai/news-image.js`
- Test: `tests/unit/news-image.test.js`

**Interfaces:**
- Produces: `buildNewsImagePrompt({ topic, caption, direction, variant }) => string`
- Produces: `titleAlignment(position) => 'flex-start' | 'center' | 'flex-end'`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { buildNewsImagePrompt, titleAlignment } from '@/lib/ai/news-image';

it('cria um prompt visual ligado ao tema e sem texto', () => {
  const prompt = buildNewsImagePrompt({
    topic: 'Vibe Coding', caption: 'IA mudou a programação', direction: 'moderno, luzes roxas', variant: 2
  });
  expect(prompt).toContain('Vibe Coding');
  expect(prompt).toContain('moderno, luzes roxas');
  expect(prompt).toMatch(/no text|no letters/i);
  expect(prompt).toContain('variation 2');
});

it('converte a posição do título em alinhamento vertical', () => {
  expect(titleAlignment('top')).toBe('flex-start');
  expect(titleAlignment('center')).toBe('center');
  expect(titleAlignment('bottom')).toBe('flex-end');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/news-image.test.js`

Expected: FAIL because `lib/ai/news-image.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export function buildNewsImagePrompt({ topic, caption, direction, variant }) {
  return [
    `Editorial social media image about: ${topic}.`,
    caption && `Context: ${caption}.`,
    direction && `Visual direction: ${direction}.`,
    `Create variation ${variant} with a distinct composition.`,
    'Square 1:1 composition. No text, no letters, no logos, no watermark.'
  ].filter(Boolean).join(' ');
}

export function titleAlignment(position) {
  return { top: 'flex-start', center: 'center', bottom: 'flex-end' }[position] || 'center';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/news-image.test.js`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/news-image.js tests/unit/news-image.test.js
git commit -m "feat: define prompts de imagem de notícia"
```

### Task 2: Gerar e salvar quatro opções de imagem

**Files:**
- Modify: `lib/ai/generate.js`
- Modify: `lib/ai-actions.js`
- Test: `tests/unit/news-image.test.js`

**Interfaces:**
- Consumes: `buildNewsImagePrompt({ topic, caption, direction, variant })`
- Produces: `generateNewsImageOptions({ supabase, brandId, topic, caption, direction }) => Promise<{ imageUrls, imageProvider, imageCost, imageModel }>`
- Produces: `generateNewsImages({ brandId, topic, caption, direction }) => Promise<{ ok, imageUrls, imageProvider, imageCost } | { error }>`

- [ ] **Step 1: Write the failing test**

```js
it('monta quatro prompts diferentes para as opções da notícia', () => {
  const prompts = [1, 2, 3, 4].map((variant) => buildNewsImagePrompt({ topic: 'futebol', caption: '', direction: '', variant }));
  expect(new Set(prompts).size).toBe(4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/news-image.test.js`

Expected: FAIL until Task 1 exports `buildNewsImagePrompt`.

- [ ] **Step 3: Write minimal implementation**

```js
export async function generateNewsImageOptions({ supabase, brandId, topic, caption, direction }) {
  if (!hasGeminiKey()) throw new Error('GEMINI_API_KEY não configurada no servidor.');
  const generated = await Promise.all([1, 2, 3, 4].map(async (variant) => {
    const image = await geminiGenerateImage({ prompt: buildNewsImagePrompt({ topic, caption, direction, variant }) });
    const path = `${brandId}/news-${Date.now()}-${variant}.png`;
    const { error } = await supabase.storage.from('media').upload(path, image.bytes, { contentType: image.contentType, upsert: true });
    if (error) throw new Error(`Upload da imagem: ${error.message}`);
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  }));
  return { imageUrls: generated, imageProvider: 'gemini', imageModel: GEMINI_IMAGE_MODEL, imageCost: geminiImageCostUsd(4) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/news-image.test.js tests/unit/ai.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/generate.js lib/ai-actions.js tests/unit/news-image.test.js
git commit -m "feat: gera opções de imagem de notícia"
```

### Task 3: Aplicar o título opcional na imagem escolhida

**Files:**
- Modify: `lib/ai/news-image.js`
- Modify: `lib/ai-actions.js`
- Test: `tests/unit/news-image.test.js`

**Interfaces:**
- Consumes: `titleAlignment(position)`
- Produces: `composeNewsImage({ sourceUrl, title, textEnabled, position, palette }) => Promise<{ bytes, contentType }>`
- Produces: `finalizeNewsImage({ brandId, sourceUrl, title, textEnabled, position }) => Promise<{ ok, imageUrl } | { error }>`

- [ ] **Step 1: Write the failing test**

```js
it('mantém a imagem original quando o título está desligado', () => {
  expect(titleOverlayNeeded({ textEnabled: false, title: 'Qualquer título' })).toBe(false);
  expect(titleOverlayNeeded({ textEnabled: true, title: '' })).toBe(false);
  expect(titleOverlayNeeded({ textEnabled: true, title: 'Futebol hoje' })).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/news-image.test.js`

Expected: FAIL because `titleOverlayNeeded` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
export function titleOverlayNeeded({ textEnabled, title }) {
  return Boolean(textEnabled && String(title || '').trim());
}
```

Use `ImageResponse` with the downloaded source image as a data URL, dark bottom-to-top gradient and an 80px bold title. When `titleOverlayNeeded` is false, return the original URL without a new upload.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/news-image.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/news-image.js lib/ai-actions.js tests/unit/news-image.test.js
git commit -m "feat: aplica título opcional em imagem de notícia"
```

### Task 4: Substituir a experiência do AI Studio

**Files:**
- Modify: `components/ai/AIStudioPanel.jsx`
- Test: `tests/unit/news-image.test.js`

**Interfaces:**
- Consumes: `generatePost`, `generateNewsImages`, `finalizeNewsImage`
- Consumes: `{ imageUrls, imageCost, imageProvider }` returned by `generateNewsImages`
- Produces: post actions receiving only the final selected image URL.

- [ ] **Step 1: Write the failing test**

```js
it('usa somente a imagem final escolhida para publicar', () => {
  expect(pickPublishedImage({ selectedUrl: 'original.png', finalUrl: 'com-titulo.png' })).toEqual(['com-titulo.png']);
  expect(pickPublishedImage({ selectedUrl: 'original.png', finalUrl: '' })).toEqual(['original.png']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/news-image.test.js`

Expected: FAIL because `pickPublishedImage` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create a small pure helper exported by `lib/ai/news-image.js`:

```js
export function pickPublishedImage({ selectedUrl, finalUrl }) {
  return finalUrl || selectedUrl ? [finalUrl || selectedUrl] : [];
}
```

Update `AIStudioPanel` to show, after copy generation: direction field, `Criar opções`, four selectable thumbnails, title toggle, title field, Topo/Centro/Base controls and a final preview. The publish payload becomes:

```js
const payload = { brandId, caption, hashtags, imageUrls: pickPublishedImage({ selectedUrl, finalUrl }) };
```

- [ ] **Step 4: Run tests and build**

Run: `npm test -- tests/unit/news-image.test.js tests/unit/ai.test.js && npm run build`

Expected: all tests pass and Next.js build finishes with `Arquivos estáticos incluídos no pacote de produção.`

- [ ] **Step 5: Commit**

```bash
git add components/ai/AIStudioPanel.jsx lib/ai/news-image.js tests/unit/news-image.test.js
git commit -m "feat: adiciona seletor de imagem de notícia"
```

### Task 5: Validar e publicar

**Files:**
- Verify: `docs/superpowers/specs/2026-07-15-ai-news-image-design.md`
- Verify: `docs/superpowers/plans/2026-07-15-news-image-generator.md`

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`

Expected: all unit tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exit 0 and static assets copied to `.next/standalone/.next/static`.

- [ ] **Step 3: Deploy the current workspace**

Run: `railway up --detach --json --service socialhub-mvp --message "Adiciona gerador de imagens de notícia"`

Expected: JSON with `deploymentId`.

- [ ] **Step 4: Verify the public app**

Run: `railway service status --service socialhub-mvp` and open `https://socialhub-mvp-production.up.railway.app/composer`.

Expected: deployment status `SUCCESS` and Composer loads.
