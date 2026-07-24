# Composer de Reels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o formato Reel do Composer num editor de vídeo real — trim, volume, áudio próprio, timeline sincronizada, capa e validação da API — reaproveitando Texto, Elementos, Legenda, Configurações e Publicação já existentes.

**Architecture:** Estado do reel vive em `doc.reel` (`video`, `audio`, `cover`) e é manipulado por funções puras em `lib/composer-reel.js`. Um único relógio de reprodução (o elemento `<video>` do canvas) alimenta canvas, timeline e prévia — o áudio sai de um só lugar para não duplicar. O render final continua server-side em ffmpeg, agora com trim, volume e faixa de áudio externa, montados por um builder de args puro e testável. A capa por frame é extraída do **vídeo já renderizado** (com os elementos gravados), não do arquivo original.

**Tech Stack:** Next.js 14 / React 18, vitest + jsdom + @testing-library/react, ffmpeg-static + sharp no render, Supabase Storage para mídia temporária, Instagram Graph API (`media_type=REELS`).

**Contexto do código atual (para quem chega sem contexto):**
- `components/composer/VisualComposer.jsx` (~1170 linhas): editor. Reel hoje é fake — `reelControls` (linha ~947) tem slider `0..23` hardcoded, `reelTime` em `useState`, e capa como 5 botões de gradiente (`doc.reel.cover` = número 0..4). `MediaBox` (~1150) renderiza `<video muted autoPlay loop>` sem controle de tempo.
- `lib/composer-editor.js`: `makeComposerDocument()` cria `reel: { ...makeSurface(), cover: 0 }`. `validateComposer` não valida vídeo. `serializeComposer` clona tudo (persistência é automática).
- `lib/composer-media-render.js`: `renderComposerVideo` (linha ~302) roda ffmpeg com overlay PNG das camadas; **não** aplica trim, volume nem áudio externo. `buildComposerVideoFilter` monta o filter_complex do vídeo. `prepareComposerMedia` (linha ~392) baixa a mídia, renderiza e sobe para `temp/<brand>/...`, devolvendo `{ urls, paths, sourceUrls, rendered }`.
- `lib/posts-actions.js`: `publishNow`/`schedulePost`/`saveDraft` já aceitam `coverUrl`, `cover_storage_path`, `thumb_offset_ms` e gravam `cover_url` (linha ~196). `prepareComposerMedia` é chamado antes (linha ~145).
- `lib/publishers/index.js` (linha ~74): reel publica com `videoUrl: urls[0]` e `coverUrl: post?.cover_url`.
- `lib/meta/graph.js` (linha ~157): `publishInstagramReel` envia `video_url`, `media_type=REELS`, `cover_url`, `share_to_feed`.
- `lib/posts-media.js`: `uploadTempMedia(supabase, brandId, file)` é genérico (usa `file.type`), serve para áudio e capa.
- Testes: `npm test` (vitest). Padrão jsdom do VisualComposer em `tests/unit/composer-media-canvas.test.jsx` (mocks de `@/lib/supabase/client`, `@/lib/posts-media`, `@/lib/posts-actions`, stubs de `React` e `ResizeObserver`).
- CSS: `components/composer/VisualComposer.module.css` é minificado; classes novas entram como uma linha nova ao final (foi assim que `.textProps` entrou).

**Decisões de design travadas:**
- **Um relógio só.** O `<video>` do canvas é a fonte da verdade do tempo (`timeupdate` + `requestAnimationFrame`). Timeline e prévia leem esse tempo; a prévia roda muda. Áudio original sai do vídeo do canvas; áudio próprio sai de um `<audio>` sincronizado.
- **Trim não corta o arquivo no cliente**, só marca `start`/`end`. O corte real acontece no ffmpeg do render final — o mesmo caminho que já grava os elementos.
- **Capa por frame é extraída do vídeo final** (depois do render, com textos e elementos já gravados), garantindo que a capa seja o que a pessoa viu. Capa por upload usa a imagem enviada direto.
- **Proporção e resolução do arquivo final são garantidas por construção**: `composerOutputSize('reel')` já devolve 1080x1920. A validação olha o que pode dar errado de verdade: duração do trecho (3s–90s, limite da API de Reels), formato de entrada (mp4/mov) e fonte de baixa resolução (avisa, não bloqueia).
- **Sem timing por elemento** (entrar/sair no meio do vídeo): o PRD pede apenas visualizar os elementos na timeline, então cada faixa cobre o trecho inteiro. Não inventar in/out.
- **Sem biblioteca de músicas do Instagram** (o PRD exclui explicitamente).
- Docs antigos (`reel.cover` numérico, sem `video`/`audio`) precisam continuar abrindo — a normalização converte na leitura.

---

### Task 1: Estado e regras do Reel (puro)

**Files:**
- Create: `lib/composer-reel.js`
- Test: `tests/unit/composer-reel.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/composer-reel.test.js
import { describe, expect, it } from 'vitest';
import {
  REEL_MAX_SECONDS, REEL_MIN_SECONDS, clampTrim, formatTimecode, makeReelState,
  normalizeReelState, reelClipDuration, validateReelMedia
} from '@/lib/composer-reel';

describe('estado do Reel (PRD Reels §1, §5, §7)', () => {
  it('cria o estado padrão do reel', () => {
    expect(makeReelState()).toEqual({
      video: { start: 0, end: null, volume: 1, muted: false },
      audio: null,
      cover: { mode: 'frame', timeMs: 0, url: null, path: null, name: '' }
    });
  });

  it('normaliza docs antigos (cover numérico, sem video/audio)', () => {
    const legacy = normalizeReelState({ cover: 3 });
    expect(legacy.cover).toEqual({ mode: 'frame', timeMs: 15000, url: null, path: null, name: '' });
    expect(legacy.video).toEqual({ start: 0, end: null, volume: 1, muted: false });
    expect(legacy.audio).toBeNull();
    expect(normalizeReelState(undefined).video.start).toBe(0);
  });

  it('mantém valores válidos e sanea os inválidos', () => {
    const state = normalizeReelState({
      video: { start: 2.5, end: 12, volume: 3, muted: 'sim' },
      audio: { url: 'https://x/a.mp3', path: 'temp/a.mp3', name: 'a.mp3', start: -4, volume: .5 },
      cover: { mode: 'upload', url: 'https://x/c.jpg', path: 'temp/c.jpg', name: 'c.jpg' }
    });
    expect(state.video).toEqual({ start: 2.5, end: 12, volume: 1, muted: true });
    expect(state.audio).toMatchObject({ url: 'https://x/a.mp3', start: 0, volume: .5 });
    expect(state.cover).toMatchObject({ mode: 'upload', url: 'https://x/c.jpg' });
  });

  it('limita o trim à duração e a um mínimo de 1s', () => {
    expect(clampTrim({ start: -3, end: 400 }, 30)).toEqual({ start: 0, end: 30 });
    expect(clampTrim({ start: 10, end: 10.2 }, 30)).toEqual({ start: 10, end: 11 });
    expect(clampTrim({ start: 29.8, end: 30 }, 30)).toEqual({ start: 29, end: 30 });
    expect(clampTrim({ start: 5, end: null }, 30)).toEqual({ start: 5, end: 30 });
  });

  it('calcula a duração do trecho', () => {
    expect(reelClipDuration({ start: 4, end: 19 }, 60)).toBe(15);
    expect(reelClipDuration({ start: 0, end: null }, 42)).toBe(42);
    expect(reelClipDuration(null, 0)).toBe(0);
  });

  it('formata o timecode', () => {
    expect(formatTimecode(0)).toBe('0:00');
    expect(formatTimecode(9.6)).toBe('0:09');
    expect(formatTimecode(75)).toBe('1:15');
  });

  it('valida duração, formato e resolução da fonte', () => {
    expect(REEL_MIN_SECONDS).toBe(3);
    expect(REEL_MAX_SECONDS).toBe(90);

    const ok = validateReelMedia({
      media: { kind: 'video', duration: 30, width: 1080, height: 1920, type: 'video/mp4' },
      video: { start: 0, end: 20 }
    });
    expect(ok).toEqual({ ok: true, errors: [], warnings: [] });

    expect(validateReelMedia({ media: null, video: {} }).errors).toEqual(['Adicione um vídeo para o Reel.']);

    const curto = validateReelMedia({
      media: { kind: 'video', duration: 30, width: 1080, height: 1920, type: 'video/mp4' },
      video: { start: 0, end: 2 }
    });
    expect(curto.ok).toBe(false);
    expect(curto.errors[0]).toContain('3 segundos');

    const longo = validateReelMedia({
      media: { kind: 'video', duration: 200, width: 1080, height: 1920, type: 'video/mp4' },
      video: { start: 0, end: 120 }
    });
    expect(longo.errors[0]).toContain('90 segundos');

    const imagem = validateReelMedia({
      media: { kind: 'image', duration: 0, width: 1080, height: 1920, type: 'image/png' },
      video: {}
    });
    expect(imagem.errors[0]).toContain('MP4 ou MOV');

    const pequeno = validateReelMedia({
      media: { kind: 'video', duration: 20, width: 320, height: 568, type: 'video/mp4' },
      video: { start: 0, end: 20 }
    });
    expect(pequeno.ok).toBe(true);
    expect(pequeno.warnings[0]).toContain('resolução');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel.test.js`
Expected: FAIL — `lib/composer-reel.js` não existe.

- [ ] **Step 3: Write the implementation**

```js
// lib/composer-reel.js
// Estado e regras do Reel (PRD Reels). Tudo puro: o mesmo módulo serve ao
// editor no navegador, à validação da publicação e aos testes.

// Limites da API de Reels do Instagram.
export const REEL_MIN_SECONDS = 3;
export const REEL_MAX_SECONDS = 90;
// Abaixo disso o arquivo final (1080x1920) vira upscale visível.
const MIN_SOURCE_HEIGHT = 960;
const MIN_CLIP_SECONDS = 1;

const clampNumber = (value, min, max, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

export function makeReelState() {
  return {
    video: { start: 0, end: null, volume: 1, muted: false },
    audio: null,
    cover: { mode: 'frame', timeMs: 0, url: null, path: null, name: '' }
  };
}

// Aceita o formato antigo (cover numérico de 0 a 4, sem video/audio) para que
// rascunhos gravados antes deste editor continuem abrindo.
export function normalizeReelState(value) {
  const base = makeReelState();
  if (!value || typeof value !== 'object') return base;

  const video = value.video && typeof value.video === 'object' ? value.video : {};
  const start = clampNumber(video.start, 0, Number.MAX_SAFE_INTEGER, 0);
  const endNumber = Number(video.end);
  const audio = value.audio && typeof value.audio === 'object' && value.audio.url
    ? {
        url: String(value.audio.url),
        path: value.audio.path ? String(value.audio.path) : null,
        name: value.audio.name ? String(value.audio.name) : '',
        start: clampNumber(value.audio.start, 0, Number.MAX_SAFE_INTEGER, 0),
        volume: clampNumber(value.audio.volume, 0, 1, 1)
      }
    : null;

  const rawCover = value.cover;
  const cover = typeof rawCover === 'number'
    ? { ...base.cover, timeMs: Math.max(0, Math.round(rawCover * 5000)) }
    : {
        mode: rawCover?.mode === 'upload' ? 'upload' : 'frame',
        timeMs: clampNumber(rawCover?.timeMs, 0, Number.MAX_SAFE_INTEGER, 0),
        url: rawCover?.url ? String(rawCover.url) : null,
        path: rawCover?.path ? String(rawCover.path) : null,
        name: rawCover?.name ? String(rawCover.name) : ''
      };

  return {
    video: {
      start,
      end: Number.isFinite(endNumber) && endNumber > start ? endNumber : null,
      volume: clampNumber(video.volume, 0, 1, 1),
      muted: Boolean(video.muted)
    },
    audio,
    cover
  };
}

// Mantém o trecho dentro do vídeo e com pelo menos 1s — o mínimo de 3s da API
// é cobrado na validação da publicação, não enquanto a pessoa arrasta.
export function clampTrim({ start, end } = {}, duration = 0) {
  const total = Math.max(0, Number(duration) || 0);
  if (!total) return { start: 0, end: 0 };
  let nextStart = clampNumber(start, 0, total, 0);
  let nextEnd = Number.isFinite(Number(end)) && Number(end) > 0
    ? clampNumber(end, 0, total, total)
    : total;
  if (nextEnd - nextStart < MIN_CLIP_SECONDS) {
    if (nextStart + MIN_CLIP_SECONDS <= total) nextEnd = nextStart + MIN_CLIP_SECONDS;
    else {
      nextEnd = total;
      nextStart = Math.max(0, total - MIN_CLIP_SECONDS);
    }
  }
  return { start: nextStart, end: nextEnd };
}

export function reelClipDuration(video, duration = 0) {
  const { start, end } = clampTrim(video || {}, duration);
  return Math.max(0, end - start);
}

export function formatTimecode(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function validateReelMedia({ media, video } = {}) {
  const errors = [];
  const warnings = [];
  if (!media) {
    return { ok: false, errors: ['Adicione um vídeo para o Reel.'], warnings };
  }
  const isVideo = media.kind === 'video' || /video\/(mp4|quicktime)/i.test(media.type || '');
  if (!isVideo) {
    errors.push('O Reel aceita apenas vídeo MP4 ou MOV.');
    return { ok: false, errors, warnings };
  }
  const duration = Math.max(0, Number(media.duration) || 0);
  if (duration) {
    const clip = reelClipDuration(video, duration);
    if (clip < REEL_MIN_SECONDS) errors.push(`O Reel precisa de pelo menos ${REEL_MIN_SECONDS} segundos.`);
    if (clip > REEL_MAX_SECONDS) errors.push(`O Reel aceita no máximo ${REEL_MAX_SECONDS} segundos.`);
  }
  const height = Number(media.height) || 0;
  if (height && height < MIN_SOURCE_HEIGHT) {
    warnings.push('O vídeo tem resolução menor que 1080x1920 e pode perder nitidez na publicação.');
  }
  return { ok: errors.length === 0, errors, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composer-reel.test.js`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add lib/composer-reel.js tests/unit/composer-reel.test.js
git commit -m "feat(composer): estado e regras do Reel (trim, audio, capa, validacao)"
```

---

### Task 2: Documento do Composer com o Reel novo

**Files:**
- Modify: `lib/composer-editor.js` (`makeComposerDocument`, `getSurface`, `validateComposer`)
- Test: `tests/unit/composer-reel.test.js` (acrescentar bloco)

- [ ] **Step 1: Write the failing test** (acrescentar ao arquivo da Task 1)

```js
import { getSurface, makeComposerDocument, validateComposer } from '@/lib/composer-editor';
import { getReelState } from '@/lib/composer-reel';

describe('documento do Composer com Reel (PRD Reels §1, §7)', () => {
  it('cria o reel com estado de vídeo, áudio e capa', () => {
    const doc = makeComposerDocument();
    expect(doc.reel.video).toEqual({ start: 0, end: null, volume: 1, muted: false });
    expect(doc.reel.audio).toBeNull();
    expect(doc.reel.cover).toMatchObject({ mode: 'frame', timeMs: 0 });
    expect(doc.reel.layers).toEqual([]);
  });

  it('lê o estado do reel normalizando documentos antigos', () => {
    expect(getReelState({ reel: { cover: 2 } }).cover.timeMs).toBe(10000);
    expect(getReelState({}).video.start).toBe(0);
  });

  it('valida o Reel na publicação', () => {
    const doc = makeComposerDocument();
    const surface = getSurface(doc, 'reel');
    surface.media = { kind: 'video', duration: 30, width: 1080, height: 1920, type: 'video/mp4', url: 'https://x/v.mp4' };
    doc.reel.video = { start: 0, end: 20, volume: 1, muted: false };
    const okState = { doc, format: 'reel', caption: '', hashtags: '' };
    expect(validateComposer(okState)).toEqual({ ok: true, errors: [] });

    doc.reel.video = { start: 0, end: 2, volume: 1, muted: false };
    const shortState = { doc, format: 'reel', caption: '', hashtags: '' };
    expect(validateComposer(shortState).ok).toBe(false);
    expect(validateComposer(shortState).errors[0]).toContain('3 segundos');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel.test.js`
Expected: FAIL — `getReelState` não existe e `doc.reel` ainda tem `cover: 0`.

- [ ] **Step 3: Add `getReelState` to `lib/composer-reel.js`**

```js
// Lê o estado do reel a partir do documento do Composer, sempre normalizado.
export function getReelState(doc) {
  return normalizeReelState(doc?.reel);
}
```

- [ ] **Step 4: Update `lib/composer-editor.js`**

Trocar o import inicial (topo do arquivo) e o reel de `makeComposerDocument`:

```js
import { makeReelState, validateReelMedia } from '@/lib/composer-reel';
```

```js
export function makeComposerDocument() {
  return {
    post: makeSurface(),
    carrossel: { slides: [makeSurface(), makeSurface()], active: 0 },
    story: makeSurface(),
    reel: { ...makeSurface(), ...makeReelState() }
  };
}
```

E dentro de `validateComposer`, logo depois da checagem `if (!surface?.media)`, acrescentar:

```js
  if (state.format === 'reel' && surface?.media) {
    const reel = validateReelMedia({ media: surface.media, video: state.doc.reel?.video });
    errors.push(...reel.errors);
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-reel.test.js tests/unit/composer-editor.test.js`
Expected: PASS. Se `composer-editor.test.js` assertar `reel: { ..., cover: 0 }`, atualizar a asserção para o novo formato (`cover` objeto, `video`, `audio`).

- [ ] **Step 6: Commit**

```bash
git add lib/composer-editor.js lib/composer-reel.js tests/unit/composer-reel.test.js tests/unit/composer-editor.test.js
git commit -m "feat(composer): documento do Reel com video, audio e capa"
```

---

### Task 3: Render final com trim, volume e áudio próprio

**Files:**
- Modify: `lib/composer-media-render.js` (`renderComposerVideo`, novo `buildReelFfmpegArgs`)
- Test: `tests/unit/composer-reel-render.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/composer-reel-render.test.js
import { describe, expect, it } from 'vitest';
import { buildReelFfmpegArgs } from '@/lib/composer-media-render';

const base = {
  inputPath: '/tmp/source.mp4',
  outputPath: '/tmp/out.mp4',
  overlayPath: null,
  audioPath: null,
  canvas: [292, 519],
  output: [1080, 1920],
  transform: { x: 0, y: 0, w: 292, h: 519, scale: 1, rot: 0 }
};

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

describe('args do ffmpeg para o Reel (PRD Reels §1, §5, §6)', () => {
  it('sem trim nem áudio externo mantém o comportamento atual', () => {
    const args = buildReelFfmpegArgs(base);
    expect(args).toContain('-i');
    expect(argValue(args, '-i')).toBe('/tmp/source.mp4');
    expect(args).not.toContain('-ss');
    expect(args).not.toContain('-an');
    expect(argValue(args, '-map')).toBe('[v]');
    expect(args.at(-1)).toBe('/tmp/out.mp4');
  });

  it('aplica o corte de início e fim', () => {
    const args = buildReelFfmpegArgs({ ...base, video: { start: 4.5, end: 19.5 } });
    expect(argValue(args, '-ss')).toBe('4.5');
    expect(argValue(args, '-t')).toBe('15');
  });

  it('silencia o vídeo quando pedido', () => {
    const args = buildReelFfmpegArgs({ ...base, video: { muted: true } });
    expect(args).toContain('-an');
    expect(args.join(' ')).not.toContain('volume=');
  });

  it('aplica volume do áudio original', () => {
    const args = buildReelFfmpegArgs({ ...base, video: { volume: 0.4 } });
    expect(args.join(' ')).toContain('volume=0.4');
  });

  it('usa faixa de áudio própria no lugar do original', () => {
    const args = buildReelFfmpegArgs({
      ...base,
      audioPath: '/tmp/track.mp3',
      audio: { start: 3, volume: 0.8 },
      video: { muted: true }
    });
    const inputs = args.filter((value, index) => args[index - 1] === '-i');
    expect(inputs).toEqual(['/tmp/source.mp4', '/tmp/track.mp3']);
    expect(args.join(' ')).toContain('volume=0.8');
    expect(args.join(' ')).toContain('[1:a]');
    expect(args.filter((value) => value === '-map')).toHaveLength(2);
  });

  it('mantém o overlay das camadas junto com o corte', () => {
    const args = buildReelFfmpegArgs({
      ...base,
      overlayPath: '/tmp/layers.png',
      video: { start: 2, end: 8 }
    });
    const graph = argValue(args, '-filter_complex');
    expect(graph).toContain('[1:v]overlay=0:0');
    expect(argValue(args, '-map')).toBe('[out]');
    expect(argValue(args, '-ss')).toBe('2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel-render.test.js`
Expected: FAIL — `buildReelFfmpegArgs` não é exportado.

- [ ] **Step 3: Implement the args builder in `lib/composer-media-render.js`**

Acrescentar depois de `buildComposerVideoFilter`:

```js
// Monta a linha de comando do ffmpeg do vídeo final. É função pura para que o
// corte, o volume e a faixa de áudio possam ser verificados sem rodar ffmpeg.
// Ordem dos inputs: 0 = vídeo, 1 = overlay das camadas (se houver), último = áudio próprio.
export function buildReelFfmpegArgs({
  inputPath,
  outputPath,
  overlayPath = null,
  audioPath = null,
  transform,
  canvas,
  output,
  video = {},
  audio = {}
}) {
  const start = Math.max(0, Number(video.start) || 0);
  const end = Number(video.end);
  const duration = Number.isFinite(end) && end > start ? end - start : null;
  const muted = Boolean(video.muted);
  const volume = Math.min(1, Math.max(0, Number(video.volume ?? 1)));
  const audioStart = Math.max(0, Number(audio.start) || 0);
  const audioVolume = Math.min(1, Math.max(0, Number(audio.volume ?? 1)));

  const args = ['-y'];
  if (start > 0) args.push('-ss', String(start));
  args.push('-i', inputPath);
  if (overlayPath) args.push('-loop', '1', '-i', overlayPath);
  if (audioPath) {
    if (audioStart > 0) args.push('-ss', String(audioStart));
    args.push('-i', audioPath);
  }
  args.push('-t', String(duration ?? MAX_VIDEO_SECONDS));

  const baseFilter = buildComposerVideoFilter({ transform, canvas, output });
  const videoLabel = overlayPath ? '[out]' : '[v]';
  const filter = overlayPath
    ? `${baseFilter};[v][1:v]overlay=0:0:shortest=1[out]`
    : baseFilter;

  const audioIndex = overlayPath ? 2 : 1;
  const audioFilters = [];
  if (audioPath) audioFilters.push(`[${audioIndex}:a]volume=${audioVolume}[a]`);
  else if (!muted && volume !== 1) audioFilters.push(`[0:a]volume=${volume}[a]`);

  args.push('-filter_complex', audioFilters.length ? `${filter};${audioFilters.join(';')}` : filter);
  args.push('-map', videoLabel);

  if (audioPath) args.push('-map', '[a]');
  else if (muted) args.push('-an');
  else if (volume !== 1) args.push('-map', '[a]');
  else args.push('-map', '0:a?');

  args.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-threads', '2',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    '-shortest',
    outputPath
  );
  return args;
}
```

- [ ] **Step 4: Use the builder in `renderComposerVideo`**

Trocar a assinatura e o corpo de `renderComposerVideo` (o bloco `await runFfmpeg([...])` inteiro) por:

```js
export async function renderComposerVideo({ source, extension, transform, canvas, output, layers = [], video = {}, audio = null, audioBytes = null }) {
  const tempRoot = path.join(os.tmpdir(), `socialhub-composer-${randomUUID()}`);
  await mkdir(tempRoot, { recursive: true });
  const inputPath = path.join(tempRoot, `source.${extension || 'mp4'}`);
  const overlayPath = path.join(tempRoot, 'layers.png');
  const audioPath = path.join(tempRoot, 'track.audio');
  const outputPath = path.join(tempRoot, 'composed.mp4');
  try {
    await writeFile(inputPath, source);
    const visibleLayers = await prepareLayersForSvg(layers.filter((layer) => layer && !layer.hidden), output[0] / canvas[0]);
    if (visibleLayers.length) {
      await sharp(Buffer.from(layersOverlaySvg(visibleLayers, canvas, output))).png().toFile(overlayPath);
    }
    if (audioBytes) await writeFile(audioPath, audioBytes);
    await runFfmpeg(buildReelFfmpegArgs({
      inputPath,
      outputPath,
      overlayPath: visibleLayers.length ? overlayPath : null,
      audioPath: audioBytes ? audioPath : null,
      transform,
      canvas,
      output,
      video,
      audio: audio || {}
    }));
    return await readFile(outputPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-reel-render.test.js tests/unit/composer-media-render.test.js`
Expected: PASS — inclusive o teste que roda ffmpeg de verdade em `composer-media-render.test.js`, provando que a linha de comando nova continua produzindo vídeo válido.

- [ ] **Step 6: Commit**

```bash
git add lib/composer-media-render.js tests/unit/composer-reel-render.test.js
git commit -m "feat(composer): render do Reel com corte, volume e audio proprio"
```

---

### Task 4: Capa do Reel extraída do vídeo final

**Files:**
- Modify: `lib/composer-media-render.js` (`extractVideoFrame`, `prepareComposerMedia`)
- Modify: `lib/posts-actions.js` (usar `prepared.coverUrl`)
- Test: `tests/unit/composer-reel-cover.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/composer-reel-cover.test.js
import { describe, expect, it } from 'vitest';
import { buildFrameFfmpegArgs } from '@/lib/composer-media-render';

describe('capa do Reel (PRD Reels §2)', () => {
  it('extrai um frame no tempo escolhido', () => {
    const args = buildFrameFfmpegArgs({ inputPath: '/tmp/final.mp4', outputPath: '/tmp/cover.jpg', timeMs: 4200 });
    expect(args[args.indexOf('-ss') + 1]).toBe('4.2');
    expect(args[args.indexOf('-i') + 1]).toBe('/tmp/final.mp4');
    expect(args[args.indexOf('-frames:v') + 1]).toBe('1');
    expect(args.at(-1)).toBe('/tmp/cover.jpg');
  });

  it('nunca pede um tempo negativo', () => {
    const args = buildFrameFfmpegArgs({ inputPath: '/a.mp4', outputPath: '/c.jpg', timeMs: -50 });
    expect(args[args.indexOf('-ss') + 1]).toBe('0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel-cover.test.js`
Expected: FAIL — `buildFrameFfmpegArgs` não existe.

- [ ] **Step 3: Implement frame extraction in `lib/composer-media-render.js`**

```js
// Extrai um quadro do vídeo JÁ RENDERIZADO — a capa mostra os textos e
// elementos exatamente como ficaram no arquivo publicado (PRD Reels §2).
export function buildFrameFfmpegArgs({ inputPath, outputPath, timeMs = 0 }) {
  const seconds = Math.max(0, Number(timeMs) || 0) / 1000;
  return ['-y', '-ss', String(seconds), '-i', inputPath, '-frames:v', '1', '-q:v', '2', outputPath];
}

export async function renderReelCoverFrame({ videoBytes, timeMs }) {
  const tempRoot = path.join(os.tmpdir(), `socialhub-cover-${randomUUID()}`);
  await mkdir(tempRoot, { recursive: true });
  const inputPath = path.join(tempRoot, 'final.mp4');
  const outputPath = path.join(tempRoot, 'cover.jpg');
  try {
    await writeFile(inputPath, videoBytes);
    await runFfmpeg(buildFrameFfmpegArgs({ inputPath, outputPath, timeMs }));
    return await readFile(outputPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Wire trim, audio and cover into `prepareComposerMedia`**

Dentro de `prepareComposerMedia`, no ramo de vídeo, passar o estado do reel e produzir a capa. Substituir a chamada `renderComposerVideo({...})` por:

```js
      const reel = editorState.format === 'reel' ? normalizeReelState(editorState.doc?.reel) : null;
      const audioBytes = reel?.audio?.url
        ? (await fetchMedia(reel.audio.url, { maxBytes: MAX_IMAGE_BYTES })).bytes
        : null;
      const bytes = video
        ? await renderComposerVideo({
            source: downloaded.bytes,
            extension: extensionOf(url, 'mp4'),
            transform: surface.bg,
            canvas,
            output,
            layers: surface.layers,
            video: reel?.video || {},
            audio: reel?.audio || null,
            audioBytes
          })
        : await renderComposerImage({
            source: downloaded.bytes,
            contentType: surface.media?.type || downloaded.contentType,
            transform: surface.bg,
            canvas,
            output,
            layers: surface.layers
          });
```

Logo depois do upload do vídeo (após `renderedPaths.push(storagePath)`), acrescentar a geração da capa:

```js
      if (video && reel?.cover?.mode === 'frame') {
        const coverBytes = await renderReelCoverFrame({ videoBytes: bytes, timeMs: reel.cover.timeMs });
        const coverPath = `temp/${brandId}/${Date.now()}-${randomUUID()}-cover.jpg`;
        const { error: coverError } = await supabase.storage.from('media').upload(coverPath, coverBytes, {
          upsert: false,
          contentType: 'image/jpeg'
        });
        if (coverError) throw new Error(`Não foi possível salvar a capa do Reel: ${coverError.message}`);
        const { data: coverData } = supabase.storage.from('media').getPublicUrl(coverPath);
        coverUrl = coverData.publicUrl;
        renderedPaths.push(coverPath);
      }
```

Declarar `let coverUrl = null;` junto de `const renderedUrls = [];` e devolvê-lo no retorno:

```js
  return {
    urls: renderedUrls,
    paths: renderedPaths,
    sourceUrls,
    coverUrl,
    rendered: renderedPaths.length > 0
  };
```

Acrescentar o import no topo do arquivo:

```js
import { normalizeReelState } from '@/lib/composer-reel';
```

- [ ] **Step 5: Use the generated cover in `lib/posts-actions.js`**

Em `publishNow` e em `schedulePost`, logo após o `prepared = await prepareComposerMedia({...})`, a capa gerada tem prioridade sobre a que veio do cliente (ela reflete o vídeo final):

```js
    if (prepared?.coverUrl) coverUrl = prepared.coverUrl;
```

Em `publishNow` o parâmetro chega como `coverUrl = null` (já é `let`? se estiver declarado como parâmetro const-like, usar uma variável local `let effectiveCoverUrl = prepared?.coverUrl || coverUrl;` e substituir os usos de `coverUrl` daí para baixo — há usos em `syncPostsMedia`, `cover_url` e `finalizePublishedTempMedia`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-reel-cover.test.js tests/unit/composer-media-render.test.js tests/unit/composer-media-lifecycle.test.js tests/unit/composer-unified.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/composer-media-render.js lib/posts-actions.js tests/unit/composer-reel-cover.test.js
git commit -m "feat(composer): capa do Reel extraida do video final"
```

---

### Task 5: Timeline do Reel

**Files:**
- Create: `components/composer/ReelTimeline.jsx`
- Test: `tests/unit/composer-reel-timeline.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/composer-reel-timeline.test.jsx
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReelTimeline } from '@/components/composer/ReelTimeline';

beforeAll(() => { vi.stubGlobal('React', React); });
afterEach(cleanup);

const layers = [
  { id: 'l1', type: 'text', text: 'Promoção' },
  { id: 'l2', type: 'icon', icon: 'whatsapp' }
];

function setup(props = {}) {
  const onSeek = vi.fn();
  const onTrim = vi.fn();
  const onTogglePlay = vi.fn();
  render(<ReelTimeline
    duration={30}
    current={6}
    playing={false}
    video={{ start: 2, end: 20, muted: false }}
    audio={null}
    layers={layers}
    onSeek={onSeek}
    onTrim={onTrim}
    onTogglePlay={onTogglePlay}
    {...props}
  />);
  return { onSeek, onTrim, onTogglePlay };
}

describe('timeline do Reel (PRD Reels §3)', () => {
  it('mostra o tempo atual e a duração do trecho', () => {
    setup();
    expect(screen.getByText('0:06')).toBeTruthy();
    expect(screen.getByText(/0:18/)).toBeTruthy();
  });

  it('lista as faixas de vídeo, áudio e cada elemento', () => {
    setup();
    expect(screen.getByRole('listitem', { name: 'Faixa de vídeo' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Faixa de áudio original' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Faixa do elemento Promoção' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Faixa do elemento Ícone' })).toBeTruthy();
  });

  it('identifica a faixa de áudio próprio quando existe', () => {
    setup({ audio: { url: 'https://x/a.mp3', name: 'trilha.mp3' } });
    expect(screen.getByRole('listitem', { name: 'Faixa de áudio trilha.mp3' })).toBeTruthy();
  });

  it('marca o áudio como silenciado', () => {
    setup({ video: { start: 0, end: 30, muted: true } });
    expect(screen.getByRole('listitem', { name: 'Faixa de áudio original (silenciado)' })).toBeTruthy();
  });

  it('busca um tempo pelo controle deslizante', () => {
    const { onSeek } = setup();
    fireEvent.change(screen.getByLabelText('Posição na linha do tempo'), { target: { value: '12' } });
    expect(onSeek).toHaveBeenCalledWith(12);
  });

  it('ajusta o corte de início e fim', () => {
    const { onTrim } = setup();
    fireEvent.change(screen.getByLabelText('Início do corte'), { target: { value: '5' } });
    expect(onTrim).toHaveBeenCalledWith({ start: 5, end: 20 });
    fireEvent.change(screen.getByLabelText('Fim do corte'), { target: { value: '25' } });
    expect(onTrim).toHaveBeenCalledWith({ start: 2, end: 25 });
  });

  it('alterna reprodução', () => {
    const { onTogglePlay } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reproduzir' }));
    expect(onTogglePlay).toHaveBeenCalled();
  });

  it('não quebra sem vídeo carregado', () => {
    render(<ReelTimeline duration={0} current={0} playing={false} video={{}} audio={null} layers={[]} onSeek={() => {}} onTrim={() => {}} onTogglePlay={() => {}} />);
    expect(screen.getByText('Adicione um vídeo para ver a linha do tempo.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel-timeline.test.jsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Write `components/composer/ReelTimeline.jsx`**

```jsx
// Linha do tempo do Reel (PRD Reels §3): régua de tempo, corte e faixas de
// vídeo, áudio e elementos. Não guarda tempo próprio — quem manda é o relógio
// do vídeo no canvas, para prévia e timeline nunca divergirem.
import { Pause, Play } from 'lucide-react';
import { clampTrim, formatTimecode, reelClipDuration } from '@/lib/composer-reel';
import { ELEMENT_ICON_MAP } from '@/data/element-icons';
import styles from './VisualComposer.module.css';

const LAYER_LABELS = { arrow: 'Seta', line: 'Linha', shape: 'Forma', icon: 'Ícone', sticker: 'Figurinha' };

function layerLabel(layer) {
  return layer.text || ELEMENT_ICON_MAP[layer.icon]?.label || LAYER_LABELS[layer.type] || 'Elemento';
}

export function ReelTimeline({ duration, current, playing, video, audio, layers = [], onSeek, onTrim, onTogglePlay }) {
  if (!duration) {
    return <div className={styles.timeline}><p className={styles.timelineEmpty}>Adicione um vídeo para ver a linha do tempo.</p></div>;
  }
  const trim = clampTrim(video || {}, duration);
  const clip = reelClipDuration(video || {}, duration);
  const percent = (value) => `${(value / duration) * 100}%`;
  const audioName = audio?.name || audio?.url ? `Faixa de áudio ${audio.name || 'própria'}` : `Faixa de áudio original${video?.muted ? ' (silenciado)' : ''}`;

  return <div className={styles.timeline}>
    <div className={styles.timelineHead}>
      <button type="button" className={styles.iconButton} aria-label={playing ? 'Pausar' : 'Reproduzir'} onClick={onTogglePlay}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span className={styles.timelineClock}>{formatTimecode(current)}</span>
      <input
        type="range"
        min="0"
        max={duration}
        step="0.1"
        value={Math.min(current, duration)}
        aria-label="Posição na linha do tempo"
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <span className={styles.timelineClock}>Trecho {formatTimecode(clip)}</span>
    </div>

    <ul className={styles.timelineTracks}>
      <li className={styles.timelineTrack} aria-label="Faixa de vídeo">
        <span className={styles.timelineTrackName}>Vídeo</span>
        <span className={styles.timelineBar}>
          <span className={styles.timelineClip} style={{ left: percent(trim.start), width: percent(trim.end - trim.start) }} />
          <span className={styles.timelinePlayhead} style={{ left: percent(Math.min(current, duration)) }} />
        </span>
      </li>
      <li className={styles.timelineTrack} aria-label={audioName}>
        <span className={styles.timelineTrackName}>Áudio</span>
        <span className={`${styles.timelineBar} ${video?.muted && !audio ? styles.timelineMuted : ''}`}>
          <span className={styles.timelineClip} style={{ left: percent(trim.start), width: percent(trim.end - trim.start) }} />
        </span>
      </li>
      {layers.map((layer) => <li key={layer.id} className={styles.timelineTrack} aria-label={`Faixa do elemento ${layerLabel(layer)}`}>
        <span className={styles.timelineTrackName}>{layerLabel(layer)}</span>
        <span className={styles.timelineBar}>
          <span className={styles.timelineClip} style={{ left: percent(trim.start), width: percent(trim.end - trim.start) }} />
        </span>
      </li>)}
    </ul>

    <div className={styles.timelineTrim}>
      <label>Início
        <input type="range" min="0" max={duration} step="0.1" value={trim.start} aria-label="Início do corte"
          onChange={(event) => onTrim(clampTrim({ start: Number(event.target.value), end: trim.end }, duration))} />
        <em>{formatTimecode(trim.start)}</em>
      </label>
      <label>Fim
        <input type="range" min="0" max={duration} step="0.1" value={trim.end} aria-label="Fim do corte"
          onChange={(event) => onTrim(clampTrim({ start: trim.start, end: Number(event.target.value) }, duration))} />
        <em>{formatTimecode(trim.end)}</em>
      </label>
    </div>
  </div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composer-reel-timeline.test.jsx`
Expected: PASS (8 testes). O teste do trim espera os valores já clampados — conferir que `clampTrim` devolve exatamente `{ start: 5, end: 20 }` e `{ start: 2, end: 25 }` para esses inputs.

- [ ] **Step 5: Commit**

```bash
git add components/composer/ReelTimeline.jsx tests/unit/composer-reel-timeline.test.jsx
git commit -m "feat(composer): linha do tempo do Reel com faixas e corte"
```

---

### Task 6: Painel de vídeo, áudio e capa

**Files:**
- Create: `components/composer/ReelVideoPanel.jsx`
- Test: `tests/unit/composer-reel-panel.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/composer-reel-panel.test.jsx
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReelVideoPanel } from '@/components/composer/ReelVideoPanel';

beforeAll(() => { vi.stubGlobal('React', React); });
afterEach(cleanup);

function setup(props = {}) {
  const handlers = {
    onVideo: vi.fn(),
    onAudio: vi.fn(),
    onCover: vi.fn(),
    onAudioFile: vi.fn(),
    onCoverFile: vi.fn(),
    onFitCanvas: vi.fn()
  };
  render(<ReelVideoPanel
    duration={30}
    current={8}
    video={{ start: 0, end: 30, volume: 1, muted: false }}
    audio={null}
    cover={{ mode: 'frame', timeMs: 0, url: null, name: '' }}
    {...handlers}
    {...props}
  />);
  return handlers;
}

describe('painel de vídeo do Reel (PRD Reels §1, §2, §5)', () => {
  it('ajusta o volume do áudio original', () => {
    const { onVideo } = setup();
    fireEvent.change(screen.getByLabelText('Volume do vídeo'), { target: { value: '0.5' } });
    expect(onVideo).toHaveBeenCalledWith({ volume: 0.5 });
  });

  it('silencia e volta a ativar o áudio original', () => {
    const { onVideo } = setup();
    fireEvent.click(screen.getByLabelText('Remover áudio original'));
    expect(onVideo).toHaveBeenCalledWith({ muted: true });
  });

  it('ajusta o enquadramento 9:16', () => {
    const { onFitCanvas } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar enquadramento 9:16' }));
    expect(onFitCanvas).toHaveBeenCalled();
  });

  it('envia áudio próprio e permite removê-lo', () => {
    const { onAudioFile, onAudio } = setup({ audio: { url: 'https://x/a.mp3', name: 'trilha.mp3', start: 0, volume: 1 } });
    expect(screen.getByText('trilha.mp3')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Volume do áudio'), { target: { value: '0.3' } });
    expect(onAudio).toHaveBeenCalledWith({ volume: 0.3 });
    fireEvent.click(screen.getByRole('button', { name: 'Remover áudio próprio' }));
    expect(onAudio).toHaveBeenCalledWith(null);
    expect(onAudioFile).not.toHaveBeenCalled();
  });

  it('corta o início do áudio próprio', () => {
    const { onAudio } = setup({ audio: { url: 'https://x/a.mp3', name: 'trilha.mp3', start: 0, volume: 1 } });
    fireEvent.change(screen.getByLabelText('Início do áudio'), { target: { value: '4' } });
    expect(onAudio).toHaveBeenCalledWith({ start: 4 });
  });

  it('usa o frame atual como capa', () => {
    const { onCover } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Usar este frame como capa' }));
    expect(onCover).toHaveBeenCalledWith({ mode: 'frame', timeMs: 8000 });
  });

  it('mostra a capa enviada e permite voltar para o frame', () => {
    const { onCover } = setup({ cover: { mode: 'upload', url: 'https://x/c.jpg', name: 'capa.jpg', timeMs: 0 } });
    expect(screen.getByAltText('Capa personalizada do Reel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Usar frame do vídeo' }));
    expect(onCover).toHaveBeenCalledWith({ mode: 'frame' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel-panel.test.jsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Write `components/composer/ReelVideoPanel.jsx`**

```jsx
// Painel Mídia quando o formato é Reel (PRD Reels §1, §2, §5). Só cuida de
// vídeo, áudio e capa — texto, elementos, legenda e configurações continuam
// nos painéis compartilhados.
import { Music, Trash2, Upload } from 'lucide-react';
import { formatTimecode } from '@/lib/composer-reel';
import styles from './VisualComposer.module.css';

export function ReelVideoPanel({
  duration, current, video, audio, cover,
  onVideo, onAudio, onCover, onAudioFile, onCoverFile, onFitCanvas
}) {
  return <>
    <div className={styles.sectionLabel}>ENQUADRAMENTO</div>
    <button type="button" className={styles.preset} onClick={onFitCanvas}>Ajustar enquadramento 9:16</button>
    <p className={styles.hint}>Arraste o vídeo no canvas para reposicionar e use a roda do mouse para dar zoom.</p>

    <div className={styles.sectionLabel}>ÁUDIO ORIGINAL</div>
    <div className={styles.toggle}><span>Remover áudio original</span>
      <button type="button" className={`${styles.switch} ${video.muted ? styles.switchOn : ''}`} aria-label="Remover áudio original" onClick={() => onVideo({ muted: !video.muted })}><span /></button>
    </div>
    <div className={styles.propRow}><span>Volume</span>
      <input type="range" min="0" max="1" step="0.05" value={video.volume ?? 1} aria-label="Volume do vídeo" disabled={video.muted} onChange={(event) => onVideo({ volume: Number(event.target.value) })} />
      <em>{Math.round((video.volume ?? 1) * 100)}%</em>
    </div>

    <div className={styles.sectionLabel}>ÁUDIO PRÓPRIO</div>
    {audio?.url ? <>
      <div className={styles.currentMedia}>
        <div className={styles.mediaPreview}><Music size={20} /></div>
        <div className={styles.mediaInfo}><strong>{audio.name || 'Áudio enviado'}</strong><small>Substitui o áudio original no arquivo final</small></div>
      </div>
      <div className={styles.propRow}><span>Volume</span>
        <input type="range" min="0" max="1" step="0.05" value={audio.volume ?? 1} aria-label="Volume do áudio" onChange={(event) => onAudio({ volume: Number(event.target.value) })} />
        <em>{Math.round((audio.volume ?? 1) * 100)}%</em>
      </div>
      <div className={styles.propRow}><span>Início</span>
        <input type="range" min="0" max={Math.max(1, duration)} step="0.5" value={audio.start ?? 0} aria-label="Início do áudio" onChange={(event) => onAudio({ start: Number(event.target.value) })} />
        <em>{formatTimecode(audio.start ?? 0)}</em>
      </div>
      <button type="button" className={`${styles.button} ${styles.removeMedia}`} aria-label="Remover áudio próprio" onClick={() => onAudio(null)}><Trash2 size={14} /> Remover áudio próprio</button>
    </> : <label className={styles.upload}>
      <Music size={20} /><strong>Enviar áudio</strong><small>MP3, M4A ou WAV</small>
      <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav" aria-label="Enviar áudio próprio" onChange={(event) => onAudioFile(event.target.files?.[0] || null)} />
    </label>}

    <div className={styles.sectionLabel}>CAPA</div>
    {cover.mode === 'upload' && cover.url
      ? <>
          <img className={styles.coverPreview} src={cover.url} alt="Capa personalizada do Reel" />
          <button type="button" className={styles.preset} onClick={() => onCover({ mode: 'frame' })}>Usar frame do vídeo</button>
        </>
      : <>
          <p className={styles.hint}>A capa é gravada a partir do vídeo final, com textos e elementos já aplicados. Agora em {formatTimecode(cover.timeMs / 1000)}.</p>
          <button type="button" className={styles.preset} onClick={() => onCover({ mode: 'frame', timeMs: Math.round(current * 1000) })}>Usar este frame como capa</button>
        </>}
    <label className={styles.upload}>
      <Upload size={20} /><strong>Enviar capa própria</strong><small>JPG ou PNG · 1080x1920</small>
      <input type="file" accept="image/jpeg,image/png" aria-label="Enviar capa personalizada" onChange={(event) => onCoverFile(event.target.files?.[0] || null)} />
    </label>
    <div className={styles.coverProfile}>
      <span className={styles.coverProfileThumb} style={cover.url ? { backgroundImage: `url("${cover.url}")` } : undefined} />
      <small>Prévia do recorte que aparece na grade do perfil.</small>
    </div>
  </>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composer-reel-panel.test.jsx`
Expected: PASS (7 testes)

- [ ] **Step 5: Commit**

```bash
git add components/composer/ReelVideoPanel.jsx tests/unit/composer-reel-panel.test.jsx
git commit -m "feat(composer): painel de video, audio e capa do Reel"
```

---

### Task 7: Integração no VisualComposer (relógio único)

**Files:**
- Modify: `components/composer/VisualComposer.jsx`
- Test: `tests/unit/composer-reel-editor.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// tests/unit/composer-reel-editor.test.jsx
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn(), saveDraft: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } }) }));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: mocks.uploadTempMedia, removeTempMedia: mocks.removeTempMedia }));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: mocks.saveDraft, schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
  mocks.uploadTempMedia.mockReset().mockResolvedValue({ path: 'temp/brand-1/reel.mp4', publicUrl: 'https://storage.test/reel.mp4' });
  mocks.removeTempMedia.mockReset().mockResolvedValue({ ok: true, paths: [] });
  mocks.saveDraft.mockReset().mockResolvedValue({ id: 'draft-1' });
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => { cleanup(); localStorage.clear(); });

async function renderReelWithVideo() {
  render(<VisualComposer brandId="brand-1" brandName="Marca" />);
  fireEvent.click(screen.getByRole('button', { name: 'Reel' }));
  const canvasUpload = screen.getByLabelText('Importar midia pelo canvas');
  const input = canvasUpload.matches('input') ? canvasUpload : canvasUpload.querySelector('input');
  fireEvent.change(input, { target: { files: [new File(['v'], 'reel.mp4', { type: 'video/mp4' })] } });
  const video = await screen.findByTestId('canvas-media');
  const element = video.querySelector('video');
  Object.defineProperty(element, 'duration', { configurable: true, value: 30 });
  Object.defineProperty(element, 'videoWidth', { configurable: true, value: 1080 });
  Object.defineProperty(element, 'videoHeight', { configurable: true, value: 1920 });
  fireEvent.loadedMetadata(element);
  return element;
}

describe('editor de Reel (PRD Reels §3, §4, §6, §7)', () => {
  it('mostra a linha do tempo com a duração real do vídeo', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Posição na linha do tempo')).toBeTruthy());
    expect(screen.getByLabelText('Posição na linha do tempo').max).toBe('30');
    expect(screen.queryByText('0:23')).toBeNull();
  });

  it('lista o vídeo como camada e mantém a seleção sincronizada', async () => {
    await renderReelWithVideo();
    const videoLayer = await screen.findByRole('button', { name: 'Selecionar camada Vídeo' });
    fireEvent.click(videoLayer);
    await waitFor(() => expect(screen.getByTestId('canvas-media').className).toContain('selectedMedia'));
  });

  it('aplica o corte pela timeline e reflete no trecho', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Fim do corte')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Fim do corte'), { target: { value: '12' } });
    await waitFor(() => expect(screen.getByText('Trecho 0:12')).toBeTruthy());
  });

  it('bloqueia publicação de trecho menor que 3 segundos', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Início do corte')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Início do corte'), { target: { value: '29' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar$/ }));
    await waitFor(() => expect(screen.getByText(/3 segundos/)).toBeTruthy());
  });

  it('silencia o áudio original pelo painel de mídia', async () => {
    await renderReelWithVideo();
    fireEvent.click(screen.getByRole('button', { name: /Mídia/ }));
    fireEvent.click(await screen.findByLabelText('Remover áudio original'));
    await waitFor(() => expect(screen.getByTestId('canvas-media').querySelector('video').muted).toBe(true));
  });

  it('salva trim, áudio e capa no rascunho', async () => {
    await renderReelWithVideo();
    await waitFor(() => expect(screen.getByLabelText('Fim do corte')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Fim do corte'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalled());
    const payload = mocks.saveDraft.mock.calls.at(-1)[0];
    expect(payload.editorState.doc.reel.video.end).toBe(15);
    expect(payload.format).toBe('reel');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composer-reel-editor.test.jsx`
Expected: FAIL — timeline e camada de vídeo não existem.

- [ ] **Step 3: Wire the reel state, clock and panels into `components/composer/VisualComposer.jsx`**

3a. Imports novos:

```js
import { clampTrim, getReelState, reelClipDuration } from '@/lib/composer-reel';
import { ReelTimeline } from './ReelTimeline';
import { ReelVideoPanel } from './ReelVideoPanel';
```

3b. Trocar os estados falsos `const [reelTime, setReelTime] = useState(0);` e o `useEffect` que incrementa `reelTime` (linhas ~242-245, o `setInterval` de 450ms) por um relógio ligado ao vídeo:

```js
  const [playhead, setPlayhead] = useState(0);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const reel = getReelState(state.doc);
  const reelDuration = state.format === 'reel' ? Number(surface.media?.duration) || 0 : 0;

  // Relógio único: o <video> do canvas manda o tempo; timeline e prévia leem.
  useEffect(() => {
    const element = videoRef.current;
    if (!element || state.format !== 'reel') return;
    function tick() {
      const trim = clampTrim(reel.video, reelDuration);
      if (element.currentTime >= trim.end) element.currentTime = trim.start;
      setPlayhead(element.currentTime);
      const track = audioRef.current;
      if (track) {
        const expected = (reel.audio?.start || 0) + (element.currentTime - trim.start);
        if (Math.abs(track.currentTime - expected) > .25) track.currentTime = Math.max(0, expected);
      }
    }
    element.addEventListener('timeupdate', tick);
    return () => element.removeEventListener('timeupdate', tick);
  }, [state.format, reel.video.start, reel.video.end, reel.audio?.start, reelDuration]);

  useEffect(() => {
    const element = videoRef.current;
    const track = audioRef.current;
    if (!element) return;
    if (playing) { element.play?.().catch(() => {}); track?.play?.().catch(() => {}); }
    else { element.pause?.(); track?.pause?.(); }
  }, [playing, reel.audio?.url]);
```

3c. Funções de mutação do reel (junto das demais, depois de `duplicateSelected`):

```js
  function patchReel(patch) {
    mutateDoc((doc) => { Object.assign(doc.reel, typeof patch === 'function' ? patch(getReelState(doc)) : patch); });
  }

  function patchReelVideo(patch) {
    mutateDoc((doc) => { doc.reel.video = { ...getReelState(doc).video, ...patch }; });
  }

  function patchReelAudio(patch) {
    mutateDoc((doc) => {
      const current = getReelState(doc).audio;
      doc.reel.audio = patch === null ? null : { ...(current || { url: '', path: null, name: '', start: 0, volume: 1 }), ...patch };
    });
  }

  function seekReel(seconds) {
    const element = videoRef.current;
    if (element) element.currentTime = seconds;
    setPlayhead(seconds);
  }

  async function uploadReelAsset(file, kind) {
    if (!file) return;
    setBusy(kind);
    try {
      const result = await uploadTempMedia(createClient(), brandId, file);
      if (kind === 'audio') patchReelAudio({ url: result.publicUrl, path: result.path, name: file.name, start: 0, volume: 1 });
      else patchReel({ cover: { mode: 'upload', url: result.publicUrl, path: result.path, name: file.name, timeMs: 0 } });
      flash(kind === 'audio' ? 'Áudio adicionado' : 'Capa adicionada');
    } catch (error) {
      setMediaError(error.message || 'Não foi possível enviar o arquivo.');
    } finally { setBusy(''); }
  }

  function fitReelCanvas() {
    mutateDoc((doc, current) => {
      const target = getSurface(doc, current.format);
      if (target.media) target.bg = fitMediaToCanvas({ width: target.media.width, height: target.media.height }, canvasSize(current.format, current.ratio));
    });
  }
```

3d. Em `syncMediaDimensions`, gravar também a duração do vídeo (o `MediaBox` passa a enviá-la):

```js
  function syncMediaDimensions(width, height, duration) {
    if (!width || !height) return;
    mutateDoc((doc, current) => {
      const targetSurface = getSurface(doc, current.format);
      if (!targetSurface.media) return;
      if (Number(duration) > 0) targetSurface.media.duration = Number(duration);
      if (targetSurface.media.width && targetSurface.media.height && targetSurface.bg?.w && targetSurface.bg?.h) return;
      targetSurface.media.width = width;
      targetSurface.media.height = height;
      targetSurface.bg = fitMediaToCanvas({ width, height }, canvasSize(current.format, current.ratio));
    }, false);
  }
```

3e. `MediaBox`: aceitar `videoRef`, `muted`, `volume` e devolver a duração. Trocar o `<video>` e o handler `dimensions`:

```jsx
  const dimensions = (event) => {
    const element = event.currentTarget;
    onDimensions?.(element.videoWidth || element.naturalWidth, element.videoHeight || element.naturalHeight, element.duration);
  };
```

```jsx
    {media.kind === 'video'
      ? <video ref={videoRef} className={styles.media} src={media.url} muted={muted} loop playsInline onLoadedMetadata={dimensions} />
      : <img className={styles.media} src={media.url} alt="" crossOrigin="anonymous" onLoad={dimensions} />}
```

E no uso do canvas (linha ~930), passar as props novas quando for reel:

```jsx
                      videoRef={state.format === 'reel' ? videoRef : undefined}
                      muted={state.format !== 'reel' ? true : reel.video.muted || Boolean(reel.audio?.url)}
                      volume={reel.video.volume}
```

Dentro do `MediaBox`, aplicar o volume por efeito (o atributo não aceita número direto):

```jsx
  useEffect(() => {
    if (videoRef?.current && typeof volume === 'number') videoRef.current.volume = Math.min(1, Math.max(0, volume));
  }, [volume, videoRef]);
```

3f. Trocar o bloco `{state.format === 'reel' && <div className={styles.reelControls}>...}` (linha ~947, com o slider 0..23 e os 5 botões de capa) pela timeline e pelo áudio próprio:

```jsx
            {state.format === 'reel' && <>
              <ReelTimeline
                duration={reelDuration}
                current={playhead}
                playing={playing}
                video={reel.video}
                audio={reel.audio}
                layers={surface.layers}
                onSeek={seekReel}
                onTrim={(trim) => patchReelVideo(trim)}
                onTogglePlay={() => setPlaying((value) => !value)}
              />
              {reel.audio?.url && <audio ref={audioRef} src={reel.audio.url} preload="auto" />}
            </>}
```

3g. No painel `midia`, quando o formato for reel e já houver mídia, acrescentar o painel novo logo após os botões de substituir/remover:

```jsx
                {state.format === 'reel' && <ReelVideoPanel
                  duration={reelDuration}
                  current={playhead}
                  video={reel.video}
                  audio={reel.audio}
                  cover={reel.cover}
                  onVideo={patchReelVideo}
                  onAudio={patchReelAudio}
                  onCover={(patch) => patchReel({ cover: { ...reel.cover, ...patch } })}
                  onAudioFile={(file) => uploadReelAsset(file, 'audio')}
                  onCoverFile={(file) => uploadReelAsset(file, 'cover')}
                  onFitCanvas={fitReelCanvas}
                />}
```

3h. `LayersPanel`: incluir o vídeo como camada e sincronizar a seleção. Passar a mídia e o handler:

```jsx
        {layersOpen && <LayersPanel surface={surface} selected={state.sel} onSelect={(id) => setState((current) => ({ ...current, sel: id }))} onPatch={updateLayer} onReorder={moveLayerInStack} onDelete={deleteLayerById} />}
```

Dentro de `LayersPanel`, antes da lista de camadas:

```jsx
    {surface.media && <div className={`${styles.layerRow} ${selected === 'bg' ? styles.layerSelected : ''}`}>
      <span className={styles.layerIcon}>{surface.media.kind === 'video' ? <Film size={13} /> : <ImageIcon size={13} />}</span>
      <button type="button" className={styles.layerName} aria-label={`Selecionar camada ${surface.media.kind === 'video' ? 'Vídeo' : 'Imagem'}`} onClick={() => onSelect('bg')}>
        {surface.media.kind === 'video' ? 'Vídeo' : 'Imagem'}
      </button>
    </div>}
```

3i. Nos payloads de `persistDraft` e `confirmPublication`, trocar o `thumb_offset_ms` antigo e enviar a capa enviada pelo usuário:

```js
        thumb_offset_ms: state.format === 'reel' ? reel.cover.timeMs : null,
        coverUrl: state.format === 'reel' && reel.cover.mode === 'upload' ? reel.cover.url : null,
```

(no `persistDraft` vale o mesmo par de campos; `saveDraft` já os aceita.)

3j. A prévia acompanha o mesmo relógio: em `PreviewSurface`, o vídeo espelha o tempo do canvas e roda mudo (o som já sai do canvas, tocar duas vezes daria eco). Passar `currentTime={playhead}` de `PreviewPanel` para `PreviewSurface` → `MediaBox` e aplicar:

```jsx
  useEffect(() => {
    const element = previewVideoRef.current;
    if (element && typeof currentTime === 'number' && Math.abs(element.currentTime - currentTime) > .25) {
      element.currentTime = currentTime;
    }
  }, [currentTime]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/composer-reel-editor.test.jsx tests/unit/composer-media-canvas.test.jsx tests/unit/composer-elements-panel.test.jsx tests/unit/composer-delete-key.test.jsx`
Expected: PASS. Se algum teste antigo procurar o slider `0..23` ou os botões `Selecionar capa N`, atualizar para a timeline.

- [ ] **Step 5: Commit**

```bash
git add components/composer/VisualComposer.jsx tests/unit/composer-reel-editor.test.jsx
git commit -m "feat(composer): editor de Reel com relogio unico, timeline e camada de video"
```

---

### Task 8: Estilos da timeline e do painel

**Files:**
- Modify: `components/composer/VisualComposer.module.css`

- [ ] **Step 1: Append the new classes**

Acrescentar como uma linha nova ao final do arquivo (o arquivo é minificado, uma regra por linha lógica):

```css
.timeline{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:min(620px,94%);background:var(--vc-panel);border:1px solid var(--vc-border);border-radius:12px;padding:8px 12px;font-size:10px}.timelineEmpty{color:var(--vc-faint);text-align:center;margin:4px 0}.timelineHead{display:flex;align-items:center;gap:8px}.timelineHead input[type=range]{flex:1;min-width:0}.timelineClock{font:10px ui-monospace,monospace;color:var(--vc-sub);white-space:nowrap}.timelineTracks{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;max-height:104px;overflow:auto}.timelineTrack{display:grid;grid-template-columns:62px 1fr;align-items:center;gap:8px;color:var(--vc-sub)}.timelineTrackName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.timelineBar{position:relative;height:14px;border-radius:5px;background:var(--vc-track);overflow:hidden}.timelineClip{position:absolute;top:0;bottom:0;background:var(--vc-accentSoft);border-left:2px solid var(--vc-accent);border-right:2px solid var(--vc-accent)}.timelineMuted{opacity:.45}.timelinePlayhead{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--vc-danger)}.timelineTrim{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}.timelineTrim label{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:6px;color:var(--vc-sub)}.timelineTrim em{font-style:normal;font:10px ui-monospace,monospace;color:var(--vc-faint);text-align:right}.hint{font-size:10.5px;line-height:1.45;color:var(--vc-faint);margin:6px 0}.coverPreview{width:100%;border-radius:10px;border:1px solid var(--vc-border);display:block;margin-bottom:8px}.coverProfile{display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--vc-faint);font-size:10px}.coverProfileThumb{width:44px;height:44px;flex:none;border-radius:8px;border:1px solid var(--vc-border);background:var(--vc-input) center/cover no-repeat}
```

- [ ] **Step 2: Verify the panel still renders**

Run: `npx vitest run tests/unit/composer-reel-timeline.test.jsx tests/unit/composer-reel-panel.test.jsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/composer/VisualComposer.module.css
git commit -m "style(composer): estilos da timeline e do painel de Reel"
```

---

### Task 9: Verificação completa

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: todos os testes passam. Corrigir regressões antes de seguir.

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: build sem erros.

- [ ] **Step 3: Prova de vídeo real (obrigatória — ver memória do projeto)**

Escrever um teste temporário em `tests/unit/zz-reel-proof.test.js` que gere um MP4 de teste com ffmpeg (`testsrc` + `sine`), rode `renderComposerVideo` com trim (`start: 1, end: 4`), `muted: false`, `volume: 0.5` e duas camadas (um texto e um ícone), grave o resultado no scratchpad e extraia a capa com `renderReelCoverFrame` em `timeMs: 2000`. Conferir com `ffprobe`/`sharp`:
- duração do arquivo ≈ 3s (o trim foi aplicado);
- resolução 1080x1920;
- existe faixa de áudio (ou não existe, quando `muted: true`);
- a capa é um JPEG 1080x1920 e mostra os elementos.

Abrir o PNG da capa e conferir visualmente. Remover o teste temporário depois.

- [ ] **Step 4: Verificação no app**

Subir o dev server (`preview_start` com `socialhub-dev`), abrir o Composer no formato Reel, subir um vídeo e conferir: timeline com duração real, play/pause, corte movendo o trecho, silenciar áudio, enviar áudio próprio, escolher frame de capa, camada "Vídeo" no painel e prévia acompanhando o tempo. Tirar screenshot. Se a tela estiver atrás de login e não for possível ver, dizer isso explicitamente em vez de afirmar que está certo.

- [ ] **Step 5: Commit final (se houve ajustes)**

```bash
git add -A
git commit -m "fix(composer): ajustes finais do editor de Reel"
```

---

## Self-Review (executado na escrita do plano)

- **Cobertura do PRD:** §1 mídia (T1 trim/volume, T3 render, T6 painel, T7 enquadramento/zoom/reposição já existentes + reprodução real); §2 capa (T4 frame do vídeo final + T6 upload e prévia de perfil); §3 timeline (T5 + T7 substituindo os botões 1–5); §4 camadas (T7 inclui o vídeo e sincroniza seleção; ocultar/bloquear/ordem/excluir já existem para os demais); §5 áudio (T1 estado, T3 ffmpeg, T6 UI); §6 prévia (T7 relógio único); §7 publicação (T2 validação, T4 capa, publicação já existente); reaproveitamento (nenhum componente de Texto/Elementos/Legenda/Config é duplicado).
- **Fora de escopo consciente:** biblioteca de músicas do Instagram (o PRD exclui); timing de entrada/saída por elemento (o PRD não pede); edição de forma de onda do áudio.
- **Consistência de tipos:** `reel.video = { start, end, volume, muted }`, `reel.audio = { url, path, name, start, volume } | null`, `reel.cover = { mode, timeMs, url, path, name }` usados com os mesmos nomes em estado, render, painel, timeline e testes. `clampTrim`, `reelClipDuration`, `formatTimecode`, `getReelState`, `normalizeReelState`, `validateReelMedia`, `buildReelFfmpegArgs`, `buildFrameFfmpegArgs`, `renderReelCoverFrame` são os nomes definitivos.
