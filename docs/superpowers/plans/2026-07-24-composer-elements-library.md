# Composer Elements Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar a seção Elementos do Composer com formas geométricas, linhas/setas variadas, 24 ícones vetoriais, 15 stickers e busca completa (inclusive de emojis), com paridade canvas ↔ prévia ↔ render final.

**Architecture:** Geometria pura em `lib/composer-element-geometry.js` compartilhada entre o canvas React (`components/composer/ElementGraphics.jsx`) e o SVG do render final (`lib/composer-media-render.js`). Catálogos de dados em `lib/composer-text-styles.js` (formas/linhas/stickers), `data/element-icons.js` (gerado de lucide-react) e `data/emoji-catalog.js` (nomes para busca). Novos tipos de camada: `line` e `icon`; tipo `shape` ganha `shape` (rect/ellipse/triangle/star/hexagon), borda e sombra; tipo `arrow` ganha `heads` e `curve`. Persistência já é genérica (`serializeComposer` clona a camada inteira).

**Tech Stack:** Next.js 14 / React 18, vitest + jsdom + @testing-library/react, sharp/librsvg no render final, lucide-react 0.428 como fonte dos paths de ícone.

**Contexto do código atual (para quem chega sem contexto):**
- `components/composer/VisualComposer.jsx` (~1157 linhas): editor completo. Painel "Elementos" nas linhas ~803-842, com busca, tabs de categoria (`ELEMENT_CATEGORIES` linha 43), grades de formas/linhas/ícones/stickers/emojis. Camadas renderizam no canvas na linha ~890 via `layerBoxStyle` + `LayerContent` (linha ~1044). `FloatingToolbar` ~934, `LayersPanel` ~1120, `ArrowGraphic` local ~1051.
- `lib/composer-editor.js`: modelo de camada (`addLayer` linha 157 define defaults — já tem `strokeW`, `strokeColor`, `shOn/shX/shY/shB/shColor`, `op`, `rot`, `hidden`, `locked`, `radius`).
- `lib/composer-text-styles.js`: catálogos atuais `ELEMENT_SHAPES` (6), `ELEMENT_LINES` (5), `SOCIALHUB_STICKERS` (13), `ELEMENT_ICONS` (16 glifos unicode) + `iconPreset`.
- `lib/composer-layer-style.js`: `layerBoxStyle` compartilhado canvas/prévia.
- `lib/composer-media-render.js`: `buildComposerLayersSvg` (linha 127) gera o SVG final; hoje trata `image` (emoji Twemoji), `shape` (só rect), `arrow` (só simples) e texto.
- `data/emoji-catalog.js`: `EMOJI_CATEGORIES` (8 categorias, ~222 emojis, todos com asset Twemoji em `assets/twemoji`).
- Testes: vitest (`npm test`). Padrão jsdom p/ VisualComposer em `tests/unit/composer-media-canvas.test.jsx` (mocks de `@/lib/supabase/client`, `@/lib/posts-media`, `@/lib/posts-actions`, stub de `ResizeObserver` e `React` global).
- `tests/unit/composer-story-styles.test.js` asserta hoje 13 stickers — precisa atualizar para 15.

**Decisões de design travadas:**
- Sombra de forma no render final = duplicata deslocada sem blur (mesmo padrão da sombra de texto já existente). No canvas, a duplicata é desenhada dentro do próprio SVG do elemento — paridade exata.
- Espessura de linha/seta = `h` da camada (já é assim para as setas atuais); sem prop nova.
- WhatsApp não existe no lucide: composto (balão `MessageCircle` + `Phone` reduzido dentro).
- Ícones usam `currentColor`; canvas resolve via CSS `color`, render final via `replaceAll('currentColor', cor)`.
- Presets antigos continuam abrindo: `shape` sem `shape` ⇒ rect; `arrow` sem `heads/curve` ⇒ simples; camadas `sticker` com glifo antigo continuam pelo caminho de texto.

---

### Task 1: Geometria compartilhada

**Files:**
- Create: `lib/composer-element-geometry.js`
- Test: `tests/unit/composer-element-geometry.test.js`

- [x] **Step 1: Write the failing test**

```js
// tests/unit/composer-element-geometry.test.js
import { describe, expect, it } from 'vitest';
import {
  SHAPE_KINDS, arrowParts, lineDashArray, pointsAttribute, polygonPoints
} from '@/lib/composer-element-geometry';

describe('geometria dos elementos (PRD Elementos §5-§7)', () => {
  it('expõe os cinco traçados de forma', () => {
    expect(SHAPE_KINDS).toEqual(['rect', 'ellipse', 'triangle', 'star', 'hexagon']);
  });

  it('gera polígonos dentro da caixa w×h', () => {
    expect(polygonPoints('triangle', 100, 80)).toEqual([[50, 0], [100, 80], [0, 80]]);
    expect(polygonPoints('hexagon', 100, 80)).toEqual([
      [25, 0], [75, 0], [100, 40], [75, 80], [25, 80], [0, 40]
    ]);
    const star = polygonPoints('star', 100, 100);
    expect(star).toHaveLength(10);
    expect(star[0][0]).toBeCloseTo(50);
    expect(star[0][1]).toBeCloseTo(0);
    for (const [x, y] of star) {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(100.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(100.01);
    }
    expect(polygonPoints('rect', 100, 80)).toBeNull();
    expect(polygonPoints('ellipse', 100, 80)).toBeNull();
  });

  it('serializa pontos com offset', () => {
    expect(pointsAttribute([[1.005, 2], [3, 4]], 10, 20)).toBe('11.01,22 13,24');
  });

  it('calcula tracejado em função da espessura', () => {
    expect(lineDashArray('solid', 4)).toBeNull();
    expect(lineDashArray('dashed', 4)).toBe('10 6.4');
    expect(lineDashArray('dotted', 4)).toBe('0.1 7.6');
  });

  it('monta seta simples, dupla e curva', () => {
    const simple = arrowParts({ w: 160, h: 36 });
    expect(simple.body.kind).toBe('line');
    expect(simple.body.x1).toBe(0);
    expect(simple.headPolygons).toHaveLength(1);
    expect(simple.stroke).toBeGreaterThan(0);

    const double = arrowParts({ w: 160, h: 36, heads: 2 });
    expect(double.headPolygons).toHaveLength(2);
    expect(double.body.x1).toBeGreaterThan(0);

    const curved = arrowParts({ w: 150, h: 60, curve: true });
    expect(curved.body.kind).toBe('path');
    expect(curved.body.d).toMatch(/^M .* Q /);
    expect(curved.headPolygons).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-element-geometry.test.js`
Expected: FAIL — módulo `lib/composer-element-geometry.js` não existe.

- [x] **Step 3: Write the implementation**

```js
// lib/composer-element-geometry.js
// Geometria pura dos elementos (formas, linhas e setas), compartilhada entre o
// canvas (React) e o render final (SVG do sharp/librsvg), para que as duas
// superfícies desenhem exatamente o mesmo traçado (PRD Elementos §16).

const round = (value) => Math.round(value * 100) / 100;

export const SHAPE_KINDS = ['rect', 'ellipse', 'triangle', 'star', 'hexagon'];

// Pontos do polígono dentro da caixa w×h (origem 0,0). rect/ellipse não usam
// polígono e retornam null.
export function polygonPoints(kind, w, h) {
  if (kind === 'triangle') return [[w / 2, 0], [w, h], [0, h]];
  if (kind === 'hexagon') {
    return [[w * .25, 0], [w * .75, 0], [w, h / 2], [w * .75, h], [w * .25, h], [0, h / 2]];
  }
  if (kind === 'star') {
    const points = [];
    for (let index = 0; index < 10; index++) {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const factor = index % 2 === 0 ? 1 : .42;
      points.push([
        w / 2 + Math.cos(angle) * (w / 2) * factor,
        h / 2 + Math.sin(angle) * (h / 2) * factor
      ]);
    }
    return points;
  }
  return null;
}

export function pointsAttribute(points, offsetX = 0, offsetY = 0) {
  return points.map(([x, y]) => `${round(x + offsetX)},${round(y + offsetY)}`).join(' ');
}

// Tracejado de linhas (§7) proporcional à espessura (h da camada). Pontilhada
// usa segmento ~0 + linecap redondo, que vira um ponto circular.
export function lineDashArray(dash, thickness) {
  if (dash === 'dashed') return `${round(thickness * 2.5)} ${round(thickness * 1.6)}`;
  if (dash === 'dotted') return `0.1 ${round(thickness * 1.9)}`;
  return null;
}

// Peças da seta (§7): corpo (linha reta ou curva quadrática) + cabeças.
// heads = 1 (simples) ou 2 (dupla); curve desenha o corpo em arco.
export function arrowParts({ w, h, heads = 1, curve = false }) {
  const stroke = Math.max(2, Math.min(h * .3, w * .12));
  const head = Math.min(w * .35, h);
  const midY = h / 2;
  const startX = heads === 2 ? head * .7 : 0;
  const endX = w - head * .7;
  const body = curve
    ? { kind: 'path', d: `M ${round(startX)} ${round(h * .9)} Q ${round(w / 2)} ${round(-h * .4)} ${round(endX)} ${round(midY)}` }
    : { kind: 'line', x1: round(startX), y1: round(midY), x2: round(endX), y2: round(midY) };
  const headPolygons = [[[w, midY], [w - head, 0], [w - head, h]]];
  if (heads === 2) headPolygons.push([[0, midY], [head, 0], [head, h]]);
  return { body, headPolygons, stroke: round(stroke) };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composer-element-geometry.test.js`
Expected: PASS (5 testes)

- [x] **Step 5: Commit**

```bash
git add lib/composer-element-geometry.js tests/unit/composer-element-geometry.test.js
git commit -m "feat(composer): geometria compartilhada de formas, linhas e setas"
```

---

### Task 2: Catálogo de formas, linhas e stickers

**Files:**
- Modify: `lib/composer-text-styles.js` (blocos `SOCIALHUB_STICKERS`, `ELEMENT_SHAPES`, `ELEMENT_LINES`; manter `ELEMENT_ICONS`/`iconPreset` até a Task 7)
- Test: `tests/unit/composer-elements-catalog.test.js` (novo) e `tests/unit/composer-story-styles.test.js` (atualizar lista de stickers)

- [x] **Step 1: Write the failing test**

```js
// tests/unit/composer-elements-catalog.test.js
import { describe, expect, it } from 'vitest';
import { ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS } from '@/lib/composer-text-styles';

describe('catálogo de elementos (PRD Elementos §5, §7, §10)', () => {
  it('disponibiliza as 11 formas do PRD', () => {
    expect(ELEMENT_SHAPES.map((shape) => shape.label)).toEqual([
      'Quadrado', 'Retângulo', 'Retângulo arredondado', 'Círculo', 'Elipse',
      'Triângulo', 'Estrela', 'Hexágono', 'Balão', 'Faixa', 'Pill'
    ]);
    for (const shape of ELEMENT_SHAPES) {
      expect(Array.isArray(shape.keywords)).toBe(true);
      expect(shape.keywords.length).toBeGreaterThan(0);
      expect(['shape', 'button']).toContain(shape.preset.type);
    }
    const kinds = ELEMENT_SHAPES.filter((shape) => shape.preset.type === 'shape').map((shape) => shape.preset.shape);
    expect(kinds).toContain('ellipse');
    expect(kinds).toContain('triangle');
    expect(kinds).toContain('star');
    expect(kinds).toContain('hexagon');
  });

  it('disponibiliza as 7 linhas e setas do PRD', () => {
    expect(ELEMENT_LINES.map((line) => line.label)).toEqual([
      'Linha reta', 'Linha pontilhada', 'Linha tracejada', 'Linha arredondada',
      'Seta simples', 'Seta dupla', 'Seta curva'
    ]);
    const byLabel = Object.fromEntries(ELEMENT_LINES.map((line) => [line.label, line.preset]));
    expect(byLabel['Linha pontilhada']).toMatchObject({ type: 'line', dash: 'dotted', cap: 'round' });
    expect(byLabel['Linha tracejada']).toMatchObject({ type: 'line', dash: 'dashed' });
    expect(byLabel['Linha arredondada']).toMatchObject({ type: 'line', cap: 'round' });
    expect(byLabel['Seta dupla']).toMatchObject({ type: 'arrow', heads: 2 });
    expect(byLabel['Seta curva']).toMatchObject({ type: 'arrow', curve: true });
  });

  it('disponibiliza os 15 stickers do PRD na ordem do documento', () => {
    expect(SOCIALHUB_STICKERS.map((sticker) => sticker.label)).toEqual([
      'Novo', 'Oferta', 'Promoção', 'Saiba mais', 'Clique aqui', 'Link na bio',
      'Últimas vagas', 'Lançamento', 'Em breve', 'Frete grátis', 'Desconto',
      'Arraste para cima', 'Confira', 'Aproveite', 'Vagas limitadas'
    ]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js`
Expected: FAIL — labels e props não batem com o catálogo atual.

- [x] **Step 3: Update the catalog**

Em `lib/composer-text-styles.js`, substituir os blocos `SOCIALHUB_STICKERS`, `ELEMENT_SHAPES` e `ELEMENT_LINES` por:

```js
export const SOCIALHUB_STICKERS = [
  sticker('Novo', '#FF375F', '#FFFFFF', 84),
  sticker('Oferta', '#FF9500', '#1D1D1F', 100),
  sticker('Promoção', '#FFD60A', '#1D1D1F', 138),
  sticker('Saiba mais', '#007AFF', '#FFFFFF', 146),
  sticker('Clique aqui', '#34C759', '#1D1D1F', 152),
  sticker('Link na bio', '#111111', '#FFFFFF', 148),
  sticker('Últimas vagas', '#D70015', '#FFFFFF', 178),
  sticker('Lançamento', '#5E5CE6', '#FFFFFF', 162),
  sticker('Em breve', '#1D1D1F', '#FFD60A', 122),
  sticker('Frete grátis', '#0A84FF', '#FFFFFF', 158),
  sticker('Desconto', '#FF375F', '#FFFFFF', 130),
  sticker('Arraste para cima', '#5856D6', '#FFFFFF', 208),
  sticker('Confira', '#FFFFFF', '#1D1D1F', 108),
  sticker('Aproveite', '#34C759', '#FFFFFF', 132),
  sticker('Vagas limitadas', '#FF9500', '#1D1D1F', 190)
];

// Formas (§5): type 'shape' desenha geometria própria (prop `shape` define o
// traçado: rect | ellipse | triangle | star | hexagon); type 'button' é uma
// forma com texto editável. `keywords` alimentam a busca do painel (§4) —
// sempre minúsculas e sem acento.
export const ELEMENT_SHAPES = [
  { label: 'Quadrado', keywords: ['quadrado', 'caixa', 'bloco'], preset: { type: 'shape', shape: 'rect', text: '', w: 90, h: 90, radius: 0, fill: '#007AFF' } },
  { label: 'Retângulo', keywords: ['retangulo', 'caixa', 'banner'], preset: { type: 'shape', shape: 'rect', text: '', w: 130, h: 84, radius: 0, fill: '#007AFF' } },
  { label: 'Retângulo arredondado', keywords: ['retangulo', 'arredondado', 'cartao'], preset: { type: 'shape', shape: 'rect', text: '', w: 130, h: 84, radius: 16, fill: '#5E5CE6' } },
  { label: 'Círculo', keywords: ['circulo', 'bola', 'redondo'], preset: { type: 'shape', shape: 'ellipse', text: '', w: 90, h: 90, radius: 0, fill: '#FF9500' } },
  { label: 'Elipse', keywords: ['elipse', 'oval'], preset: { type: 'shape', shape: 'ellipse', text: '', w: 130, h: 84, radius: 0, fill: '#FF9500' } },
  { label: 'Triângulo', keywords: ['triangulo', 'ponta'], preset: { type: 'shape', shape: 'triangle', text: '', w: 100, h: 90, radius: 0, fill: '#34C759' } },
  { label: 'Estrela', keywords: ['estrela', 'destaque', 'favorito'], preset: { type: 'shape', shape: 'star', text: '', w: 100, h: 100, radius: 0, fill: '#FFD60A' } },
  { label: 'Hexágono', keywords: ['hexagono', 'poligono', 'colmeia'], preset: { type: 'shape', shape: 'hexagon', text: '', w: 100, h: 90, radius: 0, fill: '#FF375F' } },
  { label: 'Balão', keywords: ['balao', 'fala', 'conversa'], preset: { type: 'button', text: 'Fala aí!', w: 130, h: 52, fs: 15, radius: 18, fill: '#FFFFFF', color: '#1D1D1F' } },
  { label: 'Faixa', keywords: ['faixa', 'tarja', 'destaque'], preset: { type: 'button', text: 'SUA FAIXA', w: 170, h: 38, fs: 13, radius: 0, fill: '#111111', ls: 1 } },
  { label: 'Pill', keywords: ['pill', 'botao', 'capsula'], preset: { type: 'button', text: 'Saiba mais', w: 130, h: 42, fs: 14, radius: 99 } }
];

// Linhas e setas (§7). Em `line`/`arrow`, a espessura visual vem do `h` da
// camada; `dash` e `cap` controlam o traço; `heads`/`curve` variam a seta.
export const ELEMENT_LINES = [
  { label: 'Linha reta', keywords: ['linha', 'reta', 'divisor'], preset: { type: 'line', dash: 'solid', cap: 'butt', text: '', w: 180, h: 4, fill: '#FFFFFF' } },
  { label: 'Linha pontilhada', keywords: ['linha', 'pontilhada', 'pontos'], preset: { type: 'line', dash: 'dotted', cap: 'round', text: '', w: 180, h: 4, fill: '#FFFFFF' } },
  { label: 'Linha tracejada', keywords: ['linha', 'tracejada', 'tracos'], preset: { type: 'line', dash: 'dashed', cap: 'butt', text: '', w: 180, h: 4, fill: '#FFFFFF' } },
  { label: 'Linha arredondada', keywords: ['linha', 'arredondada', 'extremidades'], preset: { type: 'line', dash: 'solid', cap: 'round', text: '', w: 180, h: 6, fill: '#FFFFFF' } },
  { label: 'Seta simples', keywords: ['seta', 'direcao', 'apontar'], preset: { type: 'arrow', heads: 1, curve: false, text: '', w: 160, h: 36, fill: '#FFFFFF' } },
  { label: 'Seta dupla', keywords: ['seta', 'dupla', 'dois lados'], preset: { type: 'arrow', heads: 2, curve: false, text: '', w: 170, h: 36, fill: '#FFFFFF' } },
  { label: 'Seta curva', keywords: ['seta', 'curva', 'arco'], preset: { type: 'arrow', heads: 1, curve: true, text: '', w: 150, h: 60, fill: '#FFFFFF' } }
];
```

- [x] **Step 4: Update the existing assertion**

Em `tests/unit/composer-story-styles.test.js`, na asserção `expect(SOCIALHUB_STICKERS.map(...)).toEqual([...])`, trocar a lista de 13 pela lista de 15 na ordem do PRD (mesma lista do teste novo acima) e ajustar o nome do teste de `13 stickers` para `15 stickers`.

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js tests/unit/composer-story-styles.test.js`
Expected: PASS. (Se `composer-story-styles` quebrar em outro ponto que use `ELEMENT_LINES`/`ELEMENT_SHAPES` — por exemplo asserções de preset antigo —, atualizar essas asserções para os novos presets acima.)

- [x] **Step 6: Commit**

```bash
git add lib/composer-text-styles.js tests/unit/composer-elements-catalog.test.js tests/unit/composer-story-styles.test.js
git commit -m "feat(composer): catalogo de formas, linhas e stickers do PRD Elementos"
```

---

### Task 3: Ícones vetoriais gerados do lucide

**Files:**
- Create: `scripts/generate-element-icons.mjs`
- Create (gerado): `data/element-icons.js`
- Test: `tests/unit/composer-elements-catalog.test.js` (acrescentar bloco)

- [x] **Step 1: Write the failing test** (acrescentar ao arquivo da Task 2)

```js
import { ELEMENT_ICON_MAP, ELEMENT_VECTOR_ICONS, iconLayerPreset } from '@/data/element-icons';

describe('ícones vetoriais (PRD Elementos §8)', () => {
  it('disponibiliza os 24 ícones do PRD', () => {
    expect(ELEMENT_VECTOR_ICONS.map((icon) => icon.id)).toEqual([
      'telefone', 'whatsapp', 'instagram', 'localizacao', 'calendario', 'relogio',
      'link', 'carrinho', 'dinheiro', 'promocao', 'atencao', 'check', 'estrela',
      'coracao', 'play', 'pause', 'volume', 'camera', 'mensagem', 'email',
      'usuario', 'seta', 'grafico', 'loja'
    ]);
  });

  it('todo ícone tem label, keywords e markup vetorial com currentColor', () => {
    for (const icon of ELEMENT_VECTOR_ICONS) {
      expect(icon.label.length).toBeGreaterThan(0);
      expect(icon.keywords.length).toBeGreaterThan(0);
      expect(icon.body).toContain('currentColor');
      expect(icon.body).toMatch(/<(path|circle|rect|line|polyline|polygon|ellipse|g)/);
    }
    expect(ELEMENT_ICON_MAP.whatsapp.body).toContain('scale');
  });

  it('gera preset de camada do tipo icon', () => {
    expect(iconLayerPreset(ELEMENT_ICON_MAP.telefone)).toMatchObject({
      type: 'icon', icon: 'telefone', w: 64, h: 64, color: '#FFFFFF'
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js`
Expected: FAIL — `data/element-icons.js` não existe.

- [x] **Step 3: Write the generator script**

```js
// scripts/generate-element-icons.mjs
// Gera data/element-icons.js a partir do lucide-react instalado, garantindo
// que canvas e render final usem exatamente o mesmo markup vetorial (PRD §8).
// Rodar de novo apenas se a lista de ícones mudar: node scripts/generate-element-icons.mjs
import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as lucide from 'lucide-react';

const pick = (...names) => {
  const found = names.map((name) => lucide[name]).find(Boolean);
  if (!found) throw new Error(`Ícone lucide não encontrado: ${names.join(', ')}`);
  return found;
};

// O <svg> raiz do lucide carrega stroke/fill; ao removê-lo, os atributos
// precisam ser reaplicados num <g> para o traço não sumir.
const inner = (component) => renderToStaticMarkup(createElement(component))
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>$/, '');
const wrap = (content) => `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</g>`;
const body = (component) => wrap(inner(component));

// WhatsApp não existe no lucide (sem ícones de marca): balão do MessageCircle
// com um fone reduzido dentro. stroke-width maior compensa a escala.
const whatsappBody = wrap(`${inner(pick('MessageCircle'))}<g transform="translate(7.7 7.7) scale(0.36)" stroke-width="5">${inner(pick('Phone'))}</g>`);

const ICONS = [
  ['telefone', 'Telefone', ['telefone', 'ligar', 'contato', 'fone'], body(pick('Phone'))],
  ['whatsapp', 'WhatsApp', ['whatsapp', 'zap', 'mensagem', 'contato'], whatsappBody],
  ['instagram', 'Instagram', ['instagram', 'insta', 'rede social'], body(pick('Instagram'))],
  ['localizacao', 'Localização', ['localizacao', 'endereco', 'mapa', 'pin'], body(pick('MapPin'))],
  ['calendario', 'Calendário', ['calendario', 'data', 'agenda'], body(pick('Calendar'))],
  ['relogio', 'Relógio', ['relogio', 'hora', 'horario', 'tempo'], body(pick('Clock'))],
  ['link', 'Link', ['link', 'url', 'site'], body(pick('Link'))],
  ['carrinho', 'Carrinho', ['carrinho', 'compras', 'comprar'], body(pick('ShoppingCart'))],
  ['dinheiro', 'Dinheiro', ['dinheiro', 'preco', 'pagamento', 'valor'], body(pick('Banknote'))],
  ['promocao', 'Promoção', ['promocao', 'desconto', 'porcentagem', 'oferta'], body(pick('BadgePercent', 'Percent'))],
  ['atencao', 'Atenção', ['atencao', 'aviso', 'alerta', 'importante'], body(pick('TriangleAlert', 'AlertTriangle'))],
  ['check', 'Check', ['check', 'confirmado', 'feito', 'ok'], body(pick('Check'))],
  ['estrela', 'Estrela', ['estrela', 'favorito', 'avaliacao'], body(pick('Star'))],
  ['coracao', 'Coração', ['coracao', 'amor', 'curtir', 'like'], body(pick('Heart'))],
  ['play', 'Play', ['play', 'assistir', 'video'], body(pick('Play'))],
  ['pause', 'Pause', ['pause', 'pausar'], body(pick('Pause'))],
  ['volume', 'Volume', ['volume', 'som', 'audio'], body(pick('Volume2'))],
  ['camera', 'Câmera', ['camera', 'foto'], body(pick('Camera'))],
  ['mensagem', 'Mensagem', ['mensagem', 'chat', 'conversa'], body(pick('MessageSquare'))],
  ['email', 'E-mail', ['email', 'correio', 'contato'], body(pick('Mail'))],
  ['usuario', 'Usuário', ['usuario', 'perfil', 'pessoa', 'cliente'], body(pick('User'))],
  ['seta', 'Seta', ['seta', 'direcao', 'proximo'], body(pick('ArrowRight'))],
  ['grafico', 'Gráfico', ['grafico', 'resultado', 'crescimento', 'dados'], body(pick('ChartColumn', 'BarChart3'))],
  ['loja', 'Loja', ['loja', 'comercio', 'negocio'], body(pick('Store'))]
];

const entries = ICONS.map(([id, label, keywords, iconBody]) => ({ id, label, keywords, body: iconBody }));

const file = `// Arquivo gerado por scripts/generate-element-icons.mjs — não editar à mão.
// Ícones vetoriais do painel Elementos (PRD §8), viewBox 0 0 24 24. O markup
// usa currentColor: no canvas a cor vem do CSS, no render final é substituída.

export const ELEMENT_VECTOR_ICONS = ${JSON.stringify(entries, null, 2)};

export const ELEMENT_ICON_MAP = Object.fromEntries(ELEMENT_VECTOR_ICONS.map((icon) => [icon.id, icon]));

export function iconLayerPreset(icon) {
  return { type: 'icon', icon: icon.id, text: '', w: 64, h: 64, fill: 'transparent', color: '#FFFFFF' };
}
`;

await writeFile('data/element-icons.js', file);
console.log(`data/element-icons.js gerado com ${entries.length} ícones.`);
```

- [x] **Step 4: Generate and verify**

Run: `node scripts/generate-element-icons.mjs`
Expected: `data/element-icons.js gerado com 24 ícones.` (Se falhar com "Ícone lucide não encontrado", conferir o nome no lucide-react 0.428 — ex.: `AlertTriangle` vs `TriangleAlert` — e acrescentar o alias correto na chamada `pick`.)

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add scripts/generate-element-icons.mjs data/element-icons.js tests/unit/composer-elements-catalog.test.js
git commit -m "feat(composer): 24 icones vetoriais gerados do lucide"
```

---

### Task 4: Busca de emojis por nome

**Files:**
- Modify: `data/emoji-catalog.js` (acrescentar ao final, antes de `RECENT_EMOJIS_KEY`)
- Test: `tests/unit/composer-elements-catalog.test.js` (acrescentar bloco)

- [x] **Step 1: Write the failing test** (acrescentar ao arquivo da Task 2)

```js
import { EMOJI_CATEGORIES, EMOJI_NAMES, normalizeSearch, searchEmojis } from '@/data/emoji-catalog';

describe('busca de emojis (PRD Elementos §12)', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizeSearch('  Coração ')).toBe('coracao');
    expect(normalizeSearch('PROMOÇÃO')).toBe('promocao');
  });

  it('todo emoji do catálogo tem nome de busca', () => {
    for (const category of EMOJI_CATEGORIES) {
      for (const emoji of category.emojis) {
        expect(EMOJI_NAMES[emoji], `sem nome: ${emoji}`).toBeTruthy();
      }
    }
  });

  it('encontra por nome, categoria e palavra relacionada', () => {
    expect(searchEmojis('fogo')).toContain('🔥');
    expect(searchEmojis('coração')).toContain('❤️');
    expect(searchEmojis('animais')).toContain('🐶');
    expect(searchEmojis('pizza')).toEqual(['🍕']);
    expect(searchEmojis('')).toEqual([]);
    expect(searchEmojis('zzz-nada')).toEqual([]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js`
Expected: FAIL — `EMOJI_NAMES`/`searchEmojis`/`normalizeSearch` não exportados.

- [x] **Step 3: Add names and search to the catalog**

Acrescentar em `data/emoji-catalog.js` (após `EMOJI_CATEGORIES`):

```js
// Normalização usada por toda a busca do painel Elementos: minúsculas, sem
// acento e sem espaços nas pontas.
export function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Nomes de busca (§12) — pt-BR, minúsculos e sem acento.
export const EMOJI_NAMES = {
  '😀': 'rosto feliz sorriso', '😁': 'sorriso dentes', '😂': 'chorando de rir risada', '🤣': 'rolando de rir risada', '😊': 'sorriso timido feliz', '😍': 'apaixonado olhos de coracao',
  '🥰': 'apaixonado coracoes amor', '😘': 'beijo', '😎': 'oculos escuros estiloso', '🤩': 'olhos de estrela deslumbrado', '🥳': 'festa aniversario comemoracao', '😜': 'lingua piscando brincadeira',
  '🤔': 'pensando duvida', '🤯': 'cabeca explodindo chocado', '😱': 'gritando medo susto', '😭': 'chorando triste', '🥺': 'olhos pidoes carente', '😴': 'dormindo sono',
  '🤗': 'abraco carinho', '🫶': 'maos formando coracao amor', '👍': 'joinha positivo curtir', '👎': 'polegar para baixo negativo', '👏': 'palmas aplauso parabens', '🙌': 'maos para cima comemoracao',
  '🙏': 'gratidao por favor oracao', '💪': 'forca musculo academia', '👀': 'olhos olhando atencao', '🗣️': 'falando voz anuncio', '💁': 'atendimento informacao', '🤝': 'aperto de maos parceria acordo',
  '✌️': 'paz e amor vitoria', '🤞': 'dedos cruzados sorte', '👉': 'apontando para direita', '👈': 'apontando para esquerda', '☝️': 'dedo para cima atencao', '💃': 'dancando festa',
  '🐶': 'cachorro pet', '🐱': 'gato pet', '🐭': 'rato', '🐹': 'hamster', '🐰': 'coelho pascoa', '🦊': 'raposa',
  '🐻': 'urso', '🐼': 'panda', '🐨': 'coala', '🦁': 'leao', '🐯': 'tigre', '🐮': 'vaca',
  '🐷': 'porco', '🐸': 'sapo', '🐵': 'macaco', '🐔': 'galinha', '🦄': 'unicornio', '🐝': 'abelha',
  '🦋': 'borboleta', '🐢': 'tartaruga', '🐬': 'golfinho', '🐳': 'baleia', '🦈': 'tubarao', '🐙': 'polvo',
  '🦜': 'papagaio', '🦩': 'flamingo',
  '🍎': 'maca fruta', '🍉': 'melancia fruta', '🍇': 'uva fruta', '🍓': 'morango fruta', '🍌': 'banana fruta', '🥑': 'abacate',
  '🌽': 'milho', '🍕': 'pizza', '🍔': 'hamburguer lanche', '🍟': 'batata frita', '🌭': 'cachorro quente', '🌮': 'taco mexicano',
  '🍣': 'sushi japones', '🍜': 'lamen sopa', '🍝': 'macarrao massa', '🥗': 'salada saudavel', '🍰': 'bolo fatia doce', '🧁': 'cupcake doce',
  '🍩': 'rosquinha donut', '🍪': 'biscoito cookie', '🍫': 'chocolate', '🍿': 'pipoca cinema', '☕': 'cafe xicara', '🧋': 'cha de bolhas bubble tea',
  '🍹': 'drink coquetel', '🥂': 'brinde tacas champanhe',
  '⚽': 'futebol bola', '🏀': 'basquete bola', '🏈': 'futebol americano', '🎾': 'tenis bola', '🏐': 'volei bola', '🎱': 'sinuca bilhar',
  '🏋️': 'academia musculacao peso', '🧘': 'yoga meditacao', '🏃': 'corrida correr', '🚴': 'bicicleta ciclismo pedalar', '🏆': 'trofeu campeao vencedor', '🥇': 'medalha de ouro primeiro lugar',
  '🎯': 'alvo meta objetivo', '🎮': 'videogame jogo controle', '🎲': 'dado jogo sorte', '🎸': 'guitarra violao musica', '🎤': 'microfone cantar podcast', '🎧': 'fone de ouvido musica',
  '🎬': 'claquete cinema filme gravacao', '🎨': 'pintura arte paleta', '🎭': 'teatro mascaras', '🎪': 'circo tenda', '🎉': 'festa confete comemoracao', '🎊': 'confete festa',
  '🎁': 'presente surpresa brinde', '🎈': 'balao festa aniversario',
  '✈️': 'aviao viagem voo', '🚗': 'carro automovel', '🚕': 'taxi', '🚌': 'onibus', '🚲': 'bicicleta', '🛵': 'moto scooter entrega',
  '🚀': 'foguete lancamento crescimento', '🛳️': 'navio cruzeiro', '🗺️': 'mapa mundi', '🧳': 'mala bagagem viagem', '🏖️': 'praia guarda-sol ferias', '🏝️': 'ilha deserta paraiso',
  '🏔️': 'montanha com neve', '🗻': 'monte fuji', '🏕️': 'acampamento camping', '🌅': 'nascer do sol', '🌄': 'amanhecer na montanha', '🌇': 'por do sol cidade',
  '🗽': 'estatua da liberdade nova york', '🗼': 'torre de toquio', '🏰': 'castelo', '⛩️': 'templo japones', '🌍': 'globo mundo europa africa', '🌎': 'globo mundo americas',
  '🌏': 'globo mundo asia oceania', '📍': 'pin localizacao endereco',
  '📱': 'celular smartphone', '💻': 'notebook computador', '⌚': 'relogio de pulso smartwatch', '📷': 'camera fotografica foto', '🎥': 'filmadora video', '💡': 'lampada ideia dica',
  '🔦': 'lanterna', '🕯️': 'vela', '📚': 'livros estudo conteudo', '✏️': 'lapis escrever', '📌': 'alfinete fixar importante', '📎': 'clipe de papel anexo',
  '🔑': 'chave acesso segredo', '🔒': 'cadeado seguranca privado', '🛒': 'carrinho de compras loja', '💳': 'cartao de credito pagamento', '💰': 'saco de dinheiro lucro', '💎': 'diamante joia premium',
  '🛍️': 'sacolas de compras', '📦': 'caixa entrega encomenda', '📣': 'megafone anuncio divulgacao', '🔔': 'sino notificacao lembrete', '⏰': 'despertador alarme hora', '🧲': 'ima atrair',
  '🪄': 'varinha magica truque', '🎀': 'laco de presente',
  '❤️': 'coracao vermelho amor', '🧡': 'coracao laranja', '💛': 'coracao amarelo', '💚': 'coracao verde', '💙': 'coracao azul', '💜': 'coracao roxo',
  '🖤': 'coracao preto', '🤍': 'coracao branco', '💔': 'coracao partido', '💯': 'cem pontos nota maxima', '✨': 'brilhos novo especial', '⭐': 'estrela favorito',
  '🌟': 'estrela brilhante destaque', '💫': 'estrela cadente', '🔥': 'fogo em alta quente', '⚡': 'raio rapido energia', '💥': 'explosao impacto', '💢': 'simbolo de raiva',
  '❗': 'exclamacao atencao', '❓': 'interrogacao duvida pergunta', '✅': 'check confirmado certo', '❌': 'xis errado cancelado', '⚠️': 'atencao aviso alerta', '♻️': 'reciclagem sustentavel',
  '🔞': 'proibido para menores dezoito', '🆕': 'novo new', '🆓': 'gratis free', '🔝': 'topo top melhor', '➡️': 'seta para direita', '⬅️': 'seta para esquerda',
  '⬆️': 'seta para cima', '⬇️': 'seta para baixo', '🔴': 'circulo vermelho ao vivo', '🟢': 'circulo verde disponivel', '🔵': 'circulo azul', '🟡': 'circulo amarelo',
  '🏁': 'bandeira quadriculada chegada', '🚩': 'bandeira vermelha alerta', '🎌': 'bandeiras cruzadas', '🏴': 'bandeira preta', '🏳️': 'bandeira branca', '🏳️‍🌈': 'bandeira arco-iris orgulho lgbt',
  '🇧🇷': 'brasil bandeira', '🇺🇸': 'estados unidos eua bandeira', '🇵🇹': 'portugal bandeira', '🇪🇸': 'espanha bandeira', '🇫🇷': 'franca bandeira', '🇮🇹': 'italia bandeira',
  '🇩🇪': 'alemanha bandeira', '🇬🇧': 'reino unido inglaterra bandeira', '🇯🇵': 'japao bandeira', '🇰🇷': 'coreia do sul bandeira', '🇨🇳': 'china bandeira', '🇦🇷': 'argentina bandeira',
  '🇲🇽': 'mexico bandeira', '🇨🇦': 'canada bandeira'
};

// Busca de emojis (§12): por nome, categoria ou o próprio caractere.
export function searchEmojis(query) {
  const term = normalizeSearch(query);
  if (!term) return [];
  return EMOJI_CATEGORIES.flatMap((category) => category.emojis.filter((emoji) =>
    emoji === query.trim()
    || normalizeSearch(category.label).includes(term)
    || normalizeSearch(EMOJI_NAMES[emoji] || '').includes(term)
  ));
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js`
Expected: PASS (o teste "todo emoji tem nome" pega qualquer emoji esquecido no mapa — se falhar, acrescentar o nome que faltou)

- [x] **Step 5: Commit**

```bash
git add data/emoji-catalog.js tests/unit/composer-elements-catalog.test.js
git commit -m "feat(composer): busca de emojis por nome e categoria"
```

---

### Task 5: Gráficos dos elementos no canvas

**Files:**
- Create: `components/composer/ElementGraphics.jsx`
- Modify: `lib/composer-layer-style.js`
- Test: `tests/unit/composer-element-graphics.test.jsx`

- [x] **Step 1: Write the failing test**

```jsx
// tests/unit/composer-element-graphics.test.jsx
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ArrowGraphic, IconGraphic, LineGraphic, ShapeGraphic } from '@/components/composer/ElementGraphics';
import { GRAPHIC_TYPES, layerBoxStyle } from '@/lib/composer-layer-style';

afterEach(cleanup);

describe('gráficos dos elementos no canvas (PRD Elementos §5-§9)', () => {
  it('desenha estrela com borda e sombra', () => {
    const { container } = render(<ShapeGraphic layer={{ type: 'shape', shape: 'star', w: 100, h: 100, fill: '#FFD60A', strokeW: 2, strokeColor: '#111111', shOn: true, shX: 2, shY: 4, shColor: 'rgba(0,0,0,0.5)' }} />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons).toHaveLength(2);
    expect(polygons[1].getAttribute('stroke')).toBe('#111111');
    expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(2 4)');
  });

  it('desenha elipse e retângulo arredondado', () => {
    const ellipse = render(<ShapeGraphic layer={{ type: 'shape', shape: 'ellipse', w: 120, h: 80, fill: '#FF9500' }} />);
    expect(ellipse.container.querySelector('ellipse')).toBeTruthy();
    cleanup();
    const rect = render(<ShapeGraphic layer={{ type: 'shape', shape: 'rect', w: 120, h: 80, radius: 16, fill: '#007AFF' }} />);
    expect(rect.container.querySelector('rect')?.getAttribute('rx')).toBe('16');
  });

  it('desenha linha tracejada com a espessura da camada', () => {
    const { container } = render(<LineGraphic layer={{ type: 'line', w: 180, h: 4, dash: 'dashed', cap: 'butt', fill: '#FFFFFF' }} />);
    const line = container.querySelector('line');
    expect(line?.getAttribute('stroke-width')).toBe('4');
    expect(line?.getAttribute('stroke-dasharray')).toBe('10 6.4');
  });

  it('desenha seta dupla e seta curva', () => {
    const double = render(<ArrowGraphic layer={{ type: 'arrow', w: 160, h: 36, heads: 2, fill: '#FFFFFF' }} />);
    expect(double.container.querySelectorAll('polygon')).toHaveLength(2);
    cleanup();
    const curved = render(<ArrowGraphic layer={{ type: 'arrow', w: 150, h: 60, curve: true, fill: '#FFFFFF' }} />);
    expect(curved.container.querySelector('path')?.getAttribute('d')).toMatch(/Q/);
  });

  it('desenha ícone vetorial com a cor da camada', () => {
    const { container } = render(<IconGraphic layer={{ type: 'icon', icon: 'coracao', w: 64, h: 64, color: '#FF375F' }} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.style.color).toBe('rgb(255, 55, 95)');
    expect(svg?.innerHTML).toContain('currentColor');
  });

  it('camadas gráficas não pintam fundo CSS', () => {
    expect(GRAPHIC_TYPES.has('shape')).toBe(true);
    const style = layerBoxStyle({ type: 'shape', shape: 'star', x: 0, y: 0, w: 100, h: 100, fill: '#FFD60A', op: 1, rot: 0, align: 'center' });
    expect(style.background).toBe('transparent');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-element-graphics.test.jsx`
Expected: FAIL — `ElementGraphics.jsx` e `GRAPHIC_TYPES` não existem.

- [x] **Step 3: Write ElementGraphics.jsx**

```jsx
// components/composer/ElementGraphics.jsx
// Desenho SVG dos elementos no canvas e na prévia. Usa a mesma geometria do
// render final (lib/composer-element-geometry) para paridade exata (§16).
// A sombra é uma duplicata deslocada sem blur — idêntica ao arquivo final.
import { arrowParts, lineDashArray, pointsAttribute, polygonPoints } from '@/lib/composer-element-geometry';
import { ELEMENT_ICON_MAP } from '@/data/element-icons';

const GRAPHIC_SVG_STYLE = { display: 'block', overflow: 'visible', pointerEvents: 'none' };

function box(layer) {
  return { w: Math.max(1, Number(layer.w) || 1), h: Math.max(1, Number(layer.h) || 1) };
}

export function ShapeGraphic({ layer }) {
  const { w, h } = box(layer);
  const kind = layer.shape || 'rect';
  const strokeProps = Number(layer.strokeW) > 0
    ? { stroke: layer.strokeColor || '#111111', strokeWidth: layer.strokeW }
    : {};
  const element = (extra) => {
    if (kind === 'ellipse') return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...extra} />;
    const points = polygonPoints(kind, w, h);
    if (points) return <polygon points={pointsAttribute(points)} {...extra} />;
    return <rect width={w} height={h} rx={Math.max(0, Number(layer.radius) || 0)} {...extra} />;
  };
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={GRAPHIC_SVG_STYLE} aria-hidden="true">
    {layer.shOn && <g transform={`translate(${Number(layer.shX) || 0} ${Number(layer.shY) || 0})`}>
      {element({ fill: layer.shColor || 'rgba(0,0,0,0.55)' })}
    </g>}
    {element({ fill: layer.fill === 'transparent' ? 'none' : layer.fill || '#007AFF', ...strokeProps })}
  </svg>;
}

export function LineGraphic({ layer }) {
  const { w, h } = box(layer);
  const color = layer.fill || layer.color || '#FFFFFF';
  const dash = lineDashArray(layer.dash, h);
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={GRAPHIC_SVG_STYLE} aria-hidden="true">
    <line x1={h / 2} y1={h / 2} x2={w - h / 2} y2={h / 2} stroke={color} strokeWidth={h} strokeLinecap={layer.cap === 'round' ? 'round' : 'butt'} {...(dash ? { strokeDasharray: dash } : {})} />
  </svg>;
}

export function ArrowGraphic({ layer }) {
  const { w, h } = box(layer);
  const color = layer.fill || layer.color || '#FFFFFF';
  const { body, headPolygons, stroke } = arrowParts({ w, h, heads: Number(layer.heads) || 1, curve: Boolean(layer.curve) });
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={GRAPHIC_SVG_STYLE} aria-hidden="true">
    {body.kind === 'path'
      ? <path d={body.d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      : <line x1={body.x1} y1={body.y1} x2={body.x2} y2={body.y2} stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
    {headPolygons.map((points, index) => <polygon key={index} points={pointsAttribute(points)} fill={color} />)}
  </svg>;
}

export function IconGraphic({ layer }) {
  const icon = ELEMENT_ICON_MAP[layer.icon];
  if (!icon) return null;
  return <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ ...GRAPHIC_SVG_STYLE, color: layer.color || '#FFFFFF' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.body }} />;
}
```

- [x] **Step 4: Update layerBoxStyle**

Em `lib/composer-layer-style.js`:

```js
export const GRAPHIC_TYPES = new Set(['shape', 'line', 'arrow', 'icon']);
```

E dentro de `layerBoxStyle`, trocar as linhas de `background` e `borderRadius` por:

```js
    background: boxBackground ? layer.bgFill : (textLike || GRAPHIC_TYPES.has(layer.type)) ? 'transparent' : layer.fill,
    borderRadius: GRAPHIC_TYPES.has(layer.type) ? 0 : boxBackground ? (layer.bgRadius ?? 8) : layer.radius,
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-element-graphics.test.jsx tests/unit/composer-story-styles.test.js`
Expected: PASS (o segundo garante que `layerBoxStyle` não regrediu para texto/button)

- [x] **Step 6: Commit**

```bash
git add components/composer/ElementGraphics.jsx lib/composer-layer-style.js tests/unit/composer-element-graphics.test.jsx
git commit -m "feat(composer): graficos SVG dos elementos no canvas"
```

---

### Task 6: Render final dos novos elementos

**Files:**
- Modify: `lib/composer-media-render.js` (função `arrowSvg` linha ~117 e ramos de `buildComposerLayersSvg` linha ~127)
- Test: `tests/unit/composer-element-render.test.js`

- [x] **Step 1: Write the failing test**

```js
// tests/unit/composer-element-render.test.js
import { describe, expect, it } from 'vitest';
import { buildComposerLayersSvg } from '@/lib/composer-media-render';

const base = { x: 10, y: 20, w: 100, h: 80, rot: 0, op: 1, hidden: false };

describe('render final dos elementos (PRD Elementos §16)', () => {
  it('renderiza elipse, triângulo, estrela e hexágono', () => {
    expect(buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'ellipse', fill: '#FF9500' }])).toContain('<ellipse');
    expect(buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'triangle', fill: '#34C759' }])).toContain('<polygon points="50,0 100,80 0,80"');
    const star = buildComposerLayersSvg([{ ...base, h: 100, type: 'shape', shape: 'star', fill: '#FFD60A' }]);
    expect(star).toContain('<polygon');
    expect(buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'hexagon', fill: '#FF375F' }])).toContain('<polygon points="25,0 75,0 100,40 75,80 25,80 0,40"');
  });

  it('renderiza retângulo com borda e sombra deslocada', () => {
    const svg = buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'rect', radius: 16, fill: '#007AFF', strokeW: 2, strokeColor: '#111111', shOn: true, shX: 3, shY: 5, shColor: 'rgba(0,0,0,0.5)' }]);
    expect(svg).toContain('rx="16"');
    expect(svg).toContain('stroke="#111111" stroke-width="2"');
    expect(svg).toContain('translate(3 5)');
    expect(svg).toContain('rgba(0,0,0,0.5)');
  });

  it('renderiza linha tracejada e pontilhada com linecap', () => {
    const dashed = buildComposerLayersSvg([{ ...base, h: 4, type: 'line', dash: 'dashed', cap: 'butt', fill: '#FFFFFF' }]);
    expect(dashed).toContain('stroke-dasharray="10 6.4"');
    expect(dashed).toContain('stroke-linecap="butt"');
    const dotted = buildComposerLayersSvg([{ ...base, h: 4, type: 'line', dash: 'dotted', cap: 'round', fill: '#FFFFFF' }]);
    expect(dotted).toContain('stroke-dasharray="0.1 7.6"');
    expect(dotted).toContain('stroke-linecap="round"');
  });

  it('renderiza seta simples, dupla e curva', () => {
    const single = buildComposerLayersSvg([{ ...base, h: 36, type: 'arrow', fill: '#FFFFFF' }]);
    expect(single.match(/<polygon/g)).toHaveLength(1);
    const double = buildComposerLayersSvg([{ ...base, h: 36, type: 'arrow', heads: 2, fill: '#FFFFFF' }]);
    expect(double.match(/<polygon/g)).toHaveLength(2);
    const curved = buildComposerLayersSvg([{ ...base, h: 60, type: 'arrow', curve: true, fill: '#FFFFFF' }]);
    expect(curved).toContain('<path d="M ');
  });

  it('renderiza ícone vetorial com escala e cor da camada', () => {
    const svg = buildComposerLayersSvg([{ ...base, w: 64, h: 64, type: 'icon', icon: 'coracao', color: '#FF375F' }]);
    expect(svg).toContain('translate(10 20) scale(');
    expect(svg).toContain('#FF375F');
    expect(svg).not.toContain('currentColor');
  });

  it('ignora ícone desconhecido sem quebrar', () => {
    expect(() => buildComposerLayersSvg([{ ...base, type: 'icon', icon: 'nao-existe', color: '#FFF' }])).not.toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-element-render.test.js`
Expected: FAIL — line/icon não renderizam; shape só suporta rect.

- [x] **Step 3: Extend buildComposerLayersSvg**

Em `lib/composer-media-render.js`:

1. Acrescentar imports:

```js
import { arrowParts, lineDashArray, pointsAttribute, polygonPoints } from '@/lib/composer-element-geometry';
import { ELEMENT_ICON_MAP } from '@/data/element-icons';
```

2. Substituir a função `arrowSvg` inteira (linhas ~117-125) por:

```js
// Geometria da forma em coordenadas relativas (0,0). fillOverride desenha a
// duplicata da sombra (§6) — sem borda, só o preenchimento deslocado.
function shapeElementSvg(layer, width, height, fillOverride = null) {
  const kind = layer.shape || 'rect';
  const fill = escapeXml(svgColor(fillOverride ?? layer.fill, 'transparent'));
  const strokeWidth = fillOverride == null ? Number(layer.strokeW) || 0 : 0;
  const stroke = strokeWidth > 0
    ? ` stroke="${escapeXml(svgColor(layer.strokeColor, '#111111'))}" stroke-width="${strokeWidth}"`
    : '';
  if (kind === 'ellipse') return `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}"${stroke}/>`;
  const points = polygonPoints(kind, width, height);
  if (points) return `<polygon points="${pointsAttribute(points)}" fill="${fill}"${stroke}/>`;
  return `<rect width="${width}" height="${height}" rx="${Math.max(0, Number(layer.radius) || 0)}" fill="${fill}"${stroke}/>`;
}
```

3. Dentro de `buildComposerLayersSvg`, substituir os ramos `if (layer.type === 'shape')` e `if (layer.type === 'arrow')` por:

```js
      if (layer.type === 'shape') {
        const pieces = [];
        if (layer.shOn) {
          pieces.push(`<g transform="translate(${Number(layer.shX) || 0} ${Number(layer.shY) || 0})">${shapeElementSvg(layer, width, height, layer.shColor || 'rgba(0,0,0,0.55)')}</g>`);
        }
        pieces.push(shapeElementSvg(layer, width, height));
        return `${open}<g transform="translate(${x} ${y})">${pieces.join('')}</g></g>`;
      }
      if (layer.type === 'line') {
        const color = escapeXml(svgColor(layer.fill || layer.color, '#FFFFFF'));
        const dash = lineDashArray(layer.dash, height);
        const cap = layer.cap === 'round' ? 'round' : 'butt';
        return `${open}<line x1="${x + height / 2}" y1="${y + height / 2}" x2="${x + width - height / 2}" y2="${y + height / 2}" stroke="${color}" stroke-width="${height}" stroke-linecap="${cap}"${dash ? ` stroke-dasharray="${dash}"` : ''}/></g>`;
      }
      if (layer.type === 'arrow') {
        const color = escapeXml(svgColor(layer.fill || layer.color, '#FFFFFF'));
        const parts = arrowParts({ w: width, h: height, heads: Number(layer.heads) || 1, curve: Boolean(layer.curve) });
        const bodySvg = parts.body.kind === 'path'
          ? `<path d="${parts.body.d}" fill="none" stroke="${color}" stroke-width="${parts.stroke}" stroke-linecap="round"/>`
          : `<line x1="${parts.body.x1}" y1="${parts.body.y1}" x2="${parts.body.x2}" y2="${parts.body.y2}" stroke="${color}" stroke-width="${parts.stroke}" stroke-linecap="round"/>`;
        const headsSvg = parts.headPolygons.map((points) => `<polygon points="${pointsAttribute(points)}" fill="${color}"/>`).join('');
        return `${open}<g transform="translate(${x} ${y})">${bodySvg}${headsSvg}</g></g>`;
      }
      if (layer.type === 'icon') {
        const icon = ELEMENT_ICON_MAP[layer.icon];
        if (!icon) return `${open}</g>`;
        const iconBody = icon.body.replaceAll('currentColor', svgColor(layer.color, '#FFFFFF'));
        return `${open}<g transform="translate(${x} ${y}) scale(${width / 24} ${height / 24})">${iconBody}</g></g>`;
      }
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-element-render.test.js tests/unit/composer-media-render.test.js tests/unit/composer-story-styles.test.js`
Expected: PASS. (Se `composer-story-styles` assertar o SVG antigo da seta — `<line x1=` com coordenadas absolutas —, atualizar a asserção para o novo formato `translate(x y)` + coordenadas relativas.)

- [x] **Step 5: Commit**

```bash
git add lib/composer-media-render.js tests/unit/composer-element-render.test.js tests/unit/composer-story-styles.test.js
git commit -m "feat(composer): render final de formas, linhas, setas e icones"
```

---

### Task 7: Painel Elementos — busca global, ícones vetoriais e propriedades

**Files:**
- Modify: `components/composer/VisualComposer.jsx`
- Modify: `lib/composer-text-styles.js` (remover `ELEMENT_ICONS` e `iconPreset`)
- Test: `tests/unit/composer-elements-panel.test.jsx`

- [x] **Step 1: Write the failing test** (mocks copiados de `tests/unit/composer-media-canvas.test.jsx`)

```jsx
// tests/unit/composer-elements-panel.test.jsx
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
});

afterEach(() => { cleanup(); localStorage.clear(); });

function openElements() {
  render(<VisualComposer brandId="brand-1" brandName="Marca" />);
  fireEvent.click(screen.getByRole('button', { name: /Elemen/ }));
}

describe('painel Elementos (PRD Elementos §3-§9)', () => {
  it('mostra as cinco categorias do PRD', () => {
    openElements();
    for (const name of ['Formas', 'Linhas e setas', 'Ícones', 'Stickers', 'Emojis']) {
      expect(screen.getByRole('tab', { name })).toBeTruthy();
    }
  });

  it('busca cruza categorias por palavra relacionada', () => {
    openElements();
    fireEvent.change(screen.getByLabelText('Buscar elementos'), { target: { value: 'seta' } });
    expect(screen.getByRole('button', { name: 'Seta dupla' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ícone Seta' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Formas' })).toBeNull();
  });

  it('busca encontra emoji por nome', () => {
    openElements();
    fireEvent.change(screen.getByLabelText('Buscar elementos'), { target: { value: 'pizza' } });
    expect(screen.getByRole('button', { name: 'Emoji 🍕' })).toBeTruthy();
  });

  it('insere ícone vetorial como camada e mostra propriedades', () => {
    openElements();
    fireEvent.click(screen.getByRole('tab', { name: 'Ícones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ícone WhatsApp' }));
    expect(screen.getByLabelText('Cor do elemento')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy(); // nome na lista de camadas via painel Camadas
  });

  it('insere forma e permite ajustar borda e sombra', () => {
    openElements();
    fireEvent.click(screen.getByRole('button', { name: 'Estrela' }));
    expect(screen.getByLabelText('Espessura da borda')).toBeTruthy();
    expect(screen.getByLabelText('Aplicar sombra na forma')).toBeTruthy();
    expect(screen.getByLabelText('Opacidade do elemento')).toBeTruthy();
  });
});
```

Nota: o teste "mostra WhatsApp na lista de camadas" depende do painel Camadas estar aberto; se `getByText('WhatsApp')` falhar por o painel estar fechado, abrir antes com `fireEvent.click(screen.getByRole('button', { name: /Camadas/ }))` e então assertar.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-elements-panel.test.jsx`
Expected: FAIL — categorias antigas, sem busca global, sem ícones vetoriais.

- [x] **Step 3: Update VisualComposer.jsx**

3a. Imports (topo do arquivo):
- Trocar `ELEMENT_ICONS, ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS` (e `iconPreset`, se importado) por `ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS` em `@/lib/composer-text-styles`.
- Acrescentar:

```js
import { ELEMENT_ICON_MAP, ELEMENT_VECTOR_ICONS, iconLayerPreset } from '@/data/element-icons';
import { normalizeSearch, searchEmojis } from '@/data/emoji-catalog';
import { ArrowGraphic, IconGraphic, LineGraphic, ShapeGraphic } from './ElementGraphics';
import { GRAPHIC_TYPES } from '@/lib/composer-layer-style';
```

(`EMOJI_CATEGORIES, RECENT_EMOJIS_KEY, RECENT_EMOJIS_LIMIT` continuam.)

3b. Linha 43: `const ELEMENT_CATEGORIES = ['Formas', 'Linhas e setas', 'Ícones', 'Stickers', 'Emojis'];`

3c. Substituir o bloco de matching (linhas ~165-178, de `const byLabel...` ou equivalente até `matchingEmojis`) por:

```js
  const elementQuery = normalizeSearch(elementSearch);
  const bySection = (section) => (item) => !elementQuery
    || normalizeSearch(section).includes(elementQuery)
    || normalizeSearch(item.label).includes(elementQuery)
    || (item.keywords || []).some((keyword) => keyword.includes(elementQuery));
  const matchingShapes = ELEMENT_SHAPES.filter(bySection('formas'));
  const matchingLines = ELEMENT_LINES.filter(bySection('linhas e setas'));
  const matchingIcons = ELEMENT_VECTOR_ICONS.filter(bySection('icones'));
  const matchingStickers = SOCIALHUB_STICKERS.filter(bySection('stickers'));
  const matchingEmojis = elementQuery
    ? searchEmojis(elementSearch)
    : emojiCategory === 'recentes'
      ? recentEmojis
      : EMOJI_CATEGORIES.find((category) => category.id === emojiCategory)?.emojis || [];
```

3d. Deletar `ArrowGraphic` local (linhas ~1051-1062) — passa a vir de `./ElementGraphics`.

3e. `LayerContent` (linha ~1044) vira:

```jsx
function LayerContent({ layer }) {
  if (layer.type === 'shape') return <ShapeGraphic layer={layer} />;
  if (layer.type === 'line') return <LineGraphic layer={layer} />;
  if (layer.type === 'arrow') return <ArrowGraphic layer={layer} />;
  if (layer.type === 'icon') return <IconGraphic layer={layer} />;
  const lineBg = layerLineBgStyle(layer);
  const text = layerDisplayText(layer);
  return lineBg ? <span style={lineBg}>{text}</span> : text;
}
```

3f. Substituir o bloco `{tool === 'elementos' && <>...</>}` (linhas ~803-842) por:

```jsx
          {tool === 'elementos' && <>
            <div className={styles.elementSearch}>
              <Search size={13} />
              <input aria-label="Buscar elementos" value={elementSearch} onChange={(event) => setElementSearch(event.target.value)} placeholder="Buscar elementos" />
            </div>
            {!elementQuery && <div className={styles.elementCategories} role="tablist" aria-label="Categorias de elementos">
              {ELEMENT_CATEGORIES.map((category) => <button key={category} type="button" role="tab" aria-selected={elementCategory === category} className={elementCategory === category ? styles.elementCategoryActive : ''} onClick={() => setElementCategory(category)}>{category}</button>)}
            </div>}
            {(elementQuery ? matchingShapes.length > 0 : elementCategory === 'Formas') && <>
              {elementQuery && <div className={styles.sectionLabel}>FORMAS</div>}
              <div className={styles.shapeGrid}>
                {matchingShapes.map(({ label, preset }) => <button key={label} className={styles.shape} aria-label={label} title={label} onClick={() => addPreset(preset)}>
                  {preset.type === 'button'
                    ? <span style={{ background: preset.fill || 'var(--vc-accent)', color: preset.color || '#fff', borderRadius: Math.min(preset.radius ?? 8, 12), fontSize: 9, padding: '3px 7px', whiteSpace: 'nowrap' }}>{preset.text}</span>
                    : <span style={{ width: 30, height: 26, display: 'block' }}><ShapeGraphic layer={{ ...preset, fill: 'var(--vc-text)' }} /></span>}
                </button>)}
              </div>
            </>}
            {(elementQuery ? matchingLines.length > 0 : elementCategory === 'Linhas e setas') && <>
              {elementQuery && <div className={styles.sectionLabel}>LINHAS E SETAS</div>}
              <div className={styles.shapeGrid}>
                {matchingLines.map(({ label, preset }) => <button key={label} className={styles.shape} aria-label={label} title={label} onClick={() => addPreset(preset)}>
                  <span style={{ width: 34, height: 18, display: 'block' }}>
                    {preset.type === 'arrow' ? <ArrowGraphic layer={{ ...preset, fill: 'var(--vc-text)' }} /> : <LineGraphic layer={{ ...preset, fill: 'var(--vc-text)' }} />}
                  </span>
                </button>)}
              </div>
            </>}
            {(elementQuery ? matchingIcons.length > 0 : elementCategory === 'Ícones') && <>
              {elementQuery && <div className={styles.sectionLabel}>ÍCONES</div>}
              <div className={styles.stickerGrid}>
                {matchingIcons.map((icon) => <button key={icon.id} className={styles.sticker} aria-label={`Ícone ${icon.label}`} title={icon.label} onClick={() => addPreset(iconLayerPreset(icon))}>
                  <svg viewBox="0 0 24 24" width="20" height="20" style={{ color: 'var(--vc-text)' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.body }} />
                </button>)}
              </div>
            </>}
            {(elementQuery ? matchingStickers.length > 0 : elementCategory === 'Stickers') && <>
              {elementQuery && <div className={styles.sectionLabel}>STICKERS</div>}
              <div className={styles.stickerList}>
                {matchingStickers.map(({ label, preset }) => <button key={label} className={styles.stickerBadge} style={{ background: preset.bgFill, color: preset.color }} onClick={() => addPreset(preset)}>{label}</button>)}
              </div>
            </>}
            {(elementQuery ? matchingEmojis.length > 0 : elementCategory === 'Emojis') && <>
              {elementQuery
                ? <div className={styles.sectionLabel}>EMOJIS</div>
                : <div className={styles.elementCategories} role="tablist" aria-label="Categorias de emojis">
                    <button type="button" role="tab" aria-selected={emojiCategory === 'recentes'} className={emojiCategory === 'recentes' ? styles.elementCategoryActive : ''} onClick={() => setEmojiCategory('recentes')}>Recentes</button>
                    {EMOJI_CATEGORIES.map((category) => <button key={category.id} type="button" role="tab" aria-selected={emojiCategory === category.id} className={emojiCategory === category.id ? styles.elementCategoryActive : ''} onClick={() => setEmojiCategory(category.id)}>{category.label}</button>)}
                  </div>}
              <div className={styles.stickerGrid}>{matchingEmojis.map((emoji) => <button key={emoji} className={styles.sticker} aria-label={`Emoji ${emoji}`} onClick={() => addEmoji(emoji)}>{emoji}</button>)}</div>
              {!elementQuery && emojiCategory === 'recentes' && !recentEmojis.length && <p style={{ fontSize: 11, color: 'var(--vc-faint)' }}>Os emojis que você usar aparecem aqui.</p>}
            </>}
            {elementQuery && !matchingShapes.length && !matchingLines.length && !matchingIcons.length && !matchingStickers.length && !matchingEmojis.length
              && <p style={{ fontSize: 11, color: 'var(--vc-faint)' }}>Nada encontrado para “{elementSearch}”.</p>}
            {selected && GRAPHIC_TYPES.has(selected.type)
              && <ElementProperties layer={selected} onPatch={(patch, history) => updateLayer(selected.id, patch, history)} onHistory={pushHistory} />}
          </>}
```

3g. Acrescentar o componente `ElementProperties` após `TextProperties` (~linha 1000):

```jsx
// Propriedades dos elementos gráficos (PRD Elementos §6, §7, §9).
function ElementProperties({ layer, onPatch, onHistory }) {
  const slider = (patch) => onPatch(patch, false);
  const isShape = layer.type === 'shape';
  const isLine = layer.type === 'line';
  const isArrow = layer.type === 'arrow';
  const colorKey = layer.type === 'icon' ? 'color' : 'fill';
  const colorValue = layer[colorKey];
  return <div className={styles.textProps}>
    <div className={styles.sectionLabel}>ELEMENTO SELECIONADO</div>
    <div className={styles.propRow}><span>Cor</span>
      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(colorValue) ? colorValue : '#ffffff'} aria-label="Cor do elemento" onChange={(event) => onPatch({ [colorKey]: event.target.value })} /></div>
    {isShape && <>
      {(layer.shape || 'rect') === 'rect' && <div className={styles.propRow}><span>Arredondamento</span>
        <input type="range" min="0" max="60" step="1" value={layer.radius ?? 0} aria-label="Arredondamento da forma" onPointerDown={onHistory} onChange={(event) => slider({ radius: +event.target.value })} /><em>{layer.radius ?? 0}</em></div>}
      <div className={styles.propRow}><span>Borda</span>
        <input type="range" min="0" max="10" step="0.5" value={layer.strokeW ?? 0} aria-label="Espessura da borda" onPointerDown={onHistory} onChange={(event) => slider({ strokeW: +event.target.value })} /><em>{layer.strokeW ?? 0}</em></div>
      {Number(layer.strokeW) > 0 && <div className={styles.propRow}><span>Cor da borda</span>
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(layer.strokeColor) ? layer.strokeColor : '#111111'} aria-label="Cor da borda" onChange={(event) => onPatch({ strokeColor: event.target.value })} /></div>}
      <div className={styles.toggle}><span>Sombra</span>
        <button className={`${styles.switch} ${layer.shOn ? styles.switchOn : ''}`} aria-label="Aplicar sombra na forma" onClick={() => onPatch({ shOn: !layer.shOn })}><span /></button></div>
    </>}
    {(isLine || isArrow) && <div className={styles.propRow}><span>Espessura</span>
      <input type="range" min="2" max={isArrow ? 80 : 24} step="1" value={Math.round(layer.h)} aria-label="Espessura da linha" onPointerDown={onHistory} onChange={(event) => slider({ h: +event.target.value })} /><em>{Math.round(layer.h)}</em></div>}
    {isLine && <div className={styles.segment}>
      <button className={(layer.dash || 'solid') === 'solid' ? styles.selected : ''} onClick={() => onPatch({ dash: 'solid' })}>Sólida</button>
      <button className={layer.dash === 'dashed' ? styles.selected : ''} onClick={() => onPatch({ dash: 'dashed' })}>Tracejada</button>
      <button className={layer.dash === 'dotted' ? styles.selected : ''} onClick={() => onPatch({ dash: 'dotted', cap: 'round' })}>Pontilhada</button>
    </div>}
    {isArrow && <div className={styles.segment}>
      <button className={(Number(layer.heads) || 1) === 1 && !layer.curve ? styles.selected : ''} onClick={() => onPatch({ heads: 1, curve: false })}>Simples</button>
      <button className={Number(layer.heads) === 2 ? styles.selected : ''} onClick={() => onPatch({ heads: 2, curve: false })}>Dupla</button>
      <button className={layer.curve ? styles.selected : ''} onClick={() => onPatch({ heads: 1, curve: !layer.curve })}>Curva</button>
    </div>}
    <div className={styles.propRow}><span>Rotação</span>
      <input type="range" min="-180" max="180" step="1" value={Math.round(layer.rot) || 0} aria-label="Rotação do elemento" onPointerDown={onHistory} onChange={(event) => slider({ rot: +event.target.value })} /><em>{Math.round(layer.rot) || 0}°</em></div>
    <div className={styles.propRow}><span>Opacidade</span>
      <input type="range" min="0.1" max="1" step="0.05" value={layer.op} aria-label="Opacidade do elemento" onPointerDown={onHistory} onChange={(event) => slider({ op: +event.target.value })} /><em>{Math.round(layer.op * 100)}%</em></div>
  </div>;
}
```

3h. `FloatingToolbar` (linha ~943): no `onPatch` dos pontos de cor, trocar a condição para `layer.type === 'text' || layer.type === 'sticker' || layer.type === 'icon' ? { color } : { fill: color }`.

3i. `LayersPanel` (linha ~1124): trocar o nome da camada por:

```jsx
<span className={styles.layerName}>{layer.text || ELEMENT_ICON_MAP[layer.icon]?.label || ({ arrow: 'Seta', line: 'Linha', shape: 'Forma', icon: 'Ícone' })[layer.type] || 'Elemento'}</span>
```

(`LayersPanel` precisa importar nada novo — `ELEMENT_ICON_MAP` já está importado no módulo.)

3j. Em `lib/composer-text-styles.js`, remover `ELEMENT_ICONS` e `iconPreset` (substituídos pelo catálogo vetorial). Rodar `npx vitest run tests/unit` depois; se algum teste ainda referenciar esses exports, atualizar para `ELEMENT_VECTOR_ICONS`/`iconLayerPreset`.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-elements-panel.test.jsx tests/unit/composer-media-canvas.test.jsx tests/unit/composer-story-styles.test.js`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add components/composer/VisualComposer.jsx lib/composer-text-styles.js tests/unit/composer-elements-panel.test.jsx
git commit -m "feat(composer): painel Elementos com busca global, icones vetoriais e propriedades"
```

---

### Task 8: Persistência round-trip

**Files:**
- Test: `tests/unit/composer-elements-catalog.test.js` (acrescentar bloco)

- [x] **Step 1: Write the test** (deve passar direto — persistência já é clone profundo; o teste protege contra regressão futura em `serializeComposer`)

```js
import { addLayer, makeSurface, serializeComposer } from '@/lib/composer-editor';

describe('persistência dos elementos (PRD Elementos §15)', () => {
  it('serializa todas as propriedades novas das camadas', () => {
    const surface = makeSurface();
    addLayer(surface, { type: 'shape', shape: 'star', fill: '#FFD60A', strokeW: 2, strokeColor: '#111', shOn: true }, [430, 430], 'l1');
    addLayer(surface, { type: 'line', dash: 'dotted', cap: 'round', fill: '#FFF' }, [430, 430], 'l2');
    addLayer(surface, { type: 'arrow', heads: 2, curve: true, fill: '#FFF' }, [430, 430], 'l3');
    addLayer(surface, { type: 'icon', icon: 'whatsapp', color: '#25D366' }, [430, 430], 'l4');
    const state = { doc: { post: surface }, format: 'post', undoStack: [1], redoStack: [2], sel: 'l1', editing: 'l1' };
    const saved = serializeComposer(state);
    const [shape, line, arrow, icon] = saved.doc.post.layers;
    expect(shape).toMatchObject({ shape: 'star', strokeW: 2, shOn: true, locked: false, hidden: false });
    expect(line).toMatchObject({ dash: 'dotted', cap: 'round' });
    expect(arrow).toMatchObject({ heads: 2, curve: true });
    expect(icon).toMatchObject({ type: 'icon', icon: 'whatsapp', color: '#25D366' });
    expect(saved.undoStack).toBeUndefined();
    expect(saved.sel).toBeUndefined();
  });
});
```

- [x] **Step 2: Run and commit**

Run: `npx vitest run tests/unit/composer-elements-catalog.test.js`
Expected: PASS

```bash
git add tests/unit/composer-elements-catalog.test.js
git commit -m "test(composer): round-trip de persistencia dos elementos"
```

---

### Task 9: Verificação completa

- [x] **Step 1: Full suite**

Run: `npm test`
Expected: todos os testes passam. Corrigir qualquer regressão antes de seguir.

- [x] **Step 2: Verificação visual (obrigatória — ver memória do projeto)**

1. Subir o dev server pela ferramenta de preview (launch.json).
2. Abrir o Composer, painel Elementos.
3. Conferir: 5 categorias; busca "seta" mistura seções; busca "pizza" acha o emoji; inserir estrela + borda + sombra; linha pontilhada; seta dupla e curva; ícone WhatsApp com cor alterada; sticker "Arraste para cima" com texto editável (duplo clique).
4. Conferir painel Camadas: nomes/ícones das camadas novas, olho/cadeado/excluir.
5. Screenshot do canvas com os elementos para o usuário.

- [x] **Step 3: Paridade do render final**

Gerar um PNG de prova pelo caminho real de render (sem publicar): script rápido no scratchpad que chama `buildComposerFrameSvg` + `sharp` com uma surface contendo estrela sombreada, linha tracejada, seta dupla, seta curva, ícone WhatsApp colorido e um sticker — comparar visualmente com o canvas (defeitos só aparecem no PNG; ver memória "PRD MVP V2").

- [x] **Step 4: Commit final (se houve ajustes)**

```bash
git add -A
git commit -m "fix(composer): ajustes de paridade visual dos elementos"
```

---

## Self-Review (executado na escrita do plano)

- **Cobertura do PRD:** §3 categorias (T7), §4 busca (T7), §5-§6 formas+personalização (T1/T2/T5/T6/T7), §7 linhas/setas (T1/T2/T5/T6/T7), §8-§9 ícones (T3/T5/T6/T7), §10-§11 stickers (T2; edição de texto já existe via duplo clique em camadas `text`), §12 emojis (T4/T7; categorias e recentes já existiam), §13 comportamento no canvas (já existia; novos tipos herdam por serem camadas), §14 camadas (já existia; T7 ajusta nomes), §15 persistência (T8), §16 render final (T6 + T9), §17 critérios verificados em T9.
- **Fora de escopo consciente:** miniatura real por camada (§14 pede "miniatura ou ícone" — mantém ícone); sombra em ícone (§9 não pede).
- **Consistência de tipos:** `shape/line/arrow/icon`, props `shape`, `dash`, `cap`, `heads`, `curve`, `icon` usadas com os mesmos nomes em catálogo, canvas, render e testes.
