import { makeReelState, validateReelMedia } from '@/lib/composer-reel';

// Proporções oficiais do Instagram (revisado 2026-07 pela documentação atual):
// feed 1:1 = 1080x1080, 4:5 (retrato recomendado) = 1080x1350,
// 3:4 (novo retrato alto) = 1080x1440, 1.91:1 (paisagem) = 1080x566,
// Story/Reel 9:16 = 1080x1920. Os pares abaixo são o tamanho de exibição no
// canvas (mesma proporção, escala reduzida); o arquivo final sai em
// composerOutputSize(). Largura mantida constante por família para o zoom da
// mídia não “pular” ao trocar de proporção.
export const COMPOSER_FORMATS = {
  post: { label: 'Post', ratios: { '1:1': [430, 430], '4:5': [384, 480], '3:4': [384, 512], '1.91:1': [600, 314] } },
  carrossel: { label: 'Carrossel', ratios: { '1:1': [420, 420], '4:5': [384, 480] } },
  story: { label: 'Story', ratios: { '9:16': [292, 519] } },
  reel: { label: 'Reel', ratios: { '9:16': [292, 519] } }
};

export function makeSurface(media = null) {
  // `bgClip` é a moldura da foto (§6): o retângulo do canvas em que a mídia
  // pode aparecer. Sem ele a mídia é uma imagem só, posicionada e sem recorte,
  // e qualquer enquadramento que PREENCHA um slot vaza por cima do texto ao
  // lado — por isso os slots de foto ficavam em `contain`, com tarja em volta,
  // que é a "arte de template" que o feed denuncia. `null` = mídia livre no
  // quadro inteiro, o comportamento de quem monta a peça à mão.
  return { media, bg: { x: 0, y: 0, scale: 1, rot: 0 }, bgClip: null, layers: [] };
}

export function makeComposerDocument() {
  return {
    post: makeSurface(),
    carrossel: { slides: [makeSurface(), makeSurface()], active: 0 },
    story: makeSurface(),
    reel: { ...makeSurface(), ...makeReelState() }
  };
}

export function getSurface(doc, format) {
  return format === 'carrossel'
    ? doc.carrossel.slides[doc.carrossel.active]
    : doc[format];
}

export function canvasSize(format, ratio = '1:1') {
  const ratios = COMPOSER_FORMATS[format]?.ratios || COMPOSER_FORMATS.post.ratios;
  return ratios[ratio] || Object.values(ratios)[0];
}

export function cloneEditorState(value) {
  return JSON.parse(JSON.stringify(value));
}

function roundGeometry(value) {
  return Math.round(value * 1000) / 1000;
}

function rotateVector(x, y, degrees) {
  const radians = degrees * Math.PI / 180;
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians)
  };
}

/**
 * Encaixe inicial da mídia no canvas.
 *
 * `contain` (padrão) mostra a foto inteira e sobra tarja — é o que sempre
 * valeu e continua valendo para upload comum.
 *
 * `cover` preenche o quadro e corta o excedente. Aqui isso é seguro, ao
 * contrário do slot com moldura: o corte acontece na borda da peça, não por
 * cima de outro elemento.
 *
 * `anchor: 'topo'` decide QUAL parte sobrevive ao corte (PRD 02 §10). Numa foto
 * vertical de pessoa, centralizar corta testa e queixo em partes iguais;
 * ancorar no topo mantém o rosto. É heurística de enquadramento, não detecção
 * facial — e por isso continua ajustável à mão depois.
 */
export function fitMediaToCanvas({ width, height } = {}, canvas = [430, 430], { mode = 'contain', anchor = 'centro' } = {}) {
  const naturalWidth = Math.max(1, Number(width) || canvas[0]);
  const naturalHeight = Math.max(1, Number(height) || canvas[1]);
  const [cw, ch] = canvas;
  const escala = mode === 'cover'
    ? Math.max(cw / naturalWidth, ch / naturalHeight)
    : Math.min(cw / naturalWidth, ch / naturalHeight);
  const w = Math.max(1, Math.round(naturalWidth * escala));
  const h = Math.max(1, Math.round(naturalHeight * escala));
  return {
    x: roundGeometry((cw - w) / 2),
    // Só o eixo vertical tem âncora: rosto some por cima, não pelos lados.
    y: anchor === 'topo' ? 0 : roundGeometry((ch - h) / 2),
    w,
    h,
    scale: 1,
    rot: 0
  };
}

export function normalizeMediaTransform(transform, media, canvas = [430, 430]) {
  if (Number(transform?.w) > 0 && Number(transform?.h) > 0) {
    return {
      x: Number(transform.x) || 0,
      y: Number(transform.y) || 0,
      w: Number(transform.w),
      h: Number(transform.h),
      scale: Math.max(.05, Number(transform.scale) || 1),
      rot: Number(transform.rot) || 0
    };
  }
  return fitMediaToCanvas({
    width: media?.width || canvas[0],
    height: media?.height || canvas[1]
  }, canvas);
}

export function zoomMediaAtPoint(transform, point, factor, { minScale = .05, maxScale = 20 } = {}) {
  const current = normalizeMediaTransform(transform);
  const nextScale = Math.min(maxScale, Math.max(minScale, current.scale * factor));
  if (nextScale === current.scale) return current;
  const renderedWidth = current.w * current.scale;
  const renderedHeight = current.h * current.scale;
  const centerX = current.x + renderedWidth / 2;
  const centerY = current.y + renderedHeight / 2;
  const localPoint = rotateVector(point.x - centerX, point.y - centerY, -current.rot);
  const anchorX = renderedWidth ? (localPoint.x + renderedWidth / 2) / renderedWidth : .5;
  const anchorY = renderedHeight ? (localPoint.y + renderedHeight / 2) / renderedHeight : .5;
  const nextWidth = current.w * nextScale;
  const nextHeight = current.h * nextScale;
  const rotatedAnchor = rotateVector(
    (anchorX - .5) * nextWidth,
    (anchorY - .5) * nextHeight,
    current.rot
  );
  const nextCenterX = point.x - rotatedAnchor.x;
  const nextCenterY = point.y - rotatedAnchor.y;
  return {
    ...current,
    x: roundGeometry(nextCenterX - nextWidth / 2),
    y: roundGeometry(nextCenterY - nextHeight / 2),
    scale: roundGeometry(nextScale)
  };
}

export function resizeMediaFromCorner(transform, corner, { dx = 0, dy = 0 } = {}, { minPixels = 24, maxScale = 20 } = {}) {
  const current = normalizeMediaTransform(transform);
  const signX = String(corner).includes('e') ? 1 : -1;
  const signY = String(corner).includes('s') ? 1 : -1;
  const localDelta = rotateVector(dx, dy, -current.rot);
  const widthDelta = signX * localDelta.x / current.w;
  const heightDelta = signY * localDelta.y / current.h;
  const delta = Math.abs(widthDelta) >= Math.abs(heightDelta) ? widthDelta : heightDelta;
  const minScale = Math.max(.05, minPixels / current.w, minPixels / current.h);
  const nextScale = Math.min(maxScale, Math.max(minScale, current.scale + delta));
  const oldWidth = current.w * current.scale;
  const oldHeight = current.h * current.scale;
  const nextWidth = current.w * nextScale;
  const nextHeight = current.h * nextScale;
  const currentCenter = {
    x: current.x + oldWidth / 2,
    y: current.y + oldHeight / 2
  };
  const fixedCorner = rotateVector(-signX * oldWidth / 2, -signY * oldHeight / 2, current.rot);
  const fixedPoint = {
    x: currentCenter.x + fixedCorner.x,
    y: currentCenter.y + fixedCorner.y
  };
  const nextFixedCorner = rotateVector(-signX * nextWidth / 2, -signY * nextHeight / 2, current.rot);
  const nextCenter = {
    x: fixedPoint.x - nextFixedCorner.x,
    y: fixedPoint.y - nextFixedCorner.y
  };
  return {
    ...current,
    x: roundGeometry(nextCenter.x - nextWidth / 2),
    y: roundGeometry(nextCenter.y - nextHeight / 2),
    scale: roundGeometry(nextScale)
  };
}

export function mediaTransformStyle(transform, media, canvas, clip = null) {
  const value = normalizeMediaTransform(transform, media, canvas);
  const width = value.w * value.scale;
  const height = value.h * value.scale;
  return {
    left: value.x,
    top: value.y,
    width,
    height,
    transform: `rotate(${value.rot}deg)`,
    ...mediaClipStyle({ x: value.x, y: value.y, w: width, h: height }, clip)
  };
}

/**
 * Recorte da mídia à moldura do slot, em `clip-path` do elemento.
 *
 * As distâncias são medidas no espaço do PRÓPRIO elemento (é assim que
 * `clip-path: inset` funciona), então a conta é a diferença entre a caixa da
 * mídia e a moldura, nunca negativa: moldura maior que a foto não corta nada.
 */
export function mediaClipStyle(box, clip) {
  if (!clip || !Number.isFinite(clip.w) || !Number.isFinite(clip.h)) return {};
  const top = Math.max(0, clip.y - box.y);
  const left = Math.max(0, clip.x - box.x);
  const right = Math.max(0, (box.x + box.w) - (clip.x + clip.w));
  const bottom = Math.max(0, (box.y + box.h) - (clip.y + clip.h));
  if (!top && !left && !right && !bottom) return {};
  return { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px)` };
}

export function addLayer(surface, preset, canvas = [430, 430], id = `l${Date.now().toString(36)}`) {
  const defaults = {
    id, type: 'text', text: 'Novo texto', x: canvas[0] / 2 - 90, y: canvas[1] / 2 - 24,
    w: 180, h: 48, fs: 28, weight: 700, italic: false, align: 'center',
    color: '#FFFFFF', fill: '#007AFF', font: 'system-ui', rot: 0, op: 1,
    hidden: false, locked: false, radius: 10,
    // Propriedades avançadas de texto (PRD Story §8-§9)
    ls: 0, lh: 1.05, tt: 'none',
    bgMode: 'none', bgFill: '#111111', bgRadius: 8,
    strokeW: 0, strokeColor: '#111111',
    shOn: false, shX: 0, shY: 3, shB: 8, shColor: 'rgba(0,0,0,0.55)'
  };
  const layer = { ...defaults, ...preset, id };
  surface.layers.push(layer);
  return layer;
}

// Move uma camada para uma posição absoluta da pilha (0 = mais ao fundo).
// Camadas renderizam na ordem do array: última fica por cima.
export function moveLayerToIndex(surface, id, index) {
  const from = surface.layers.findIndex((layer) => layer.id === id);
  if (from < 0) return false;
  const to = Math.min(surface.layers.length - 1, Math.max(0, Math.round(index)));
  if (to === from) return false;
  const [layer] = surface.layers.splice(from, 1);
  surface.layers.splice(to, 0, layer);
  return true;
}

// Move uma camada na pilha (delta +1 = para frente, -1 = para trás).
export function reorderLayer(surface, id, delta) {
  const from = surface.layers.findIndex((layer) => layer.id === id);
  if (from < 0) return false;
  return moveLayerToIndex(surface, id, from + delta);
}

// Texto efetivo exibido/renderizado, aplicando caixa alta/baixa (§8).
export function layerDisplayText(layer) {
  const text = String(layer?.text ?? '');
  if (layer?.tt === 'upper') return text.toLocaleUpperCase('pt-BR');
  if (layer?.tt === 'lower') return text.toLocaleLowerCase('pt-BR');
  return text;
}

// Alinhamento inteligente (PRD Correções §2.8): compara as três referências da
// caixa arrastada (início, centro, fim) com as bordas e o centro do canvas e de
// cada outro elemento. A linha mais próxima dentro do limiar vence e puxa a
// caixa (efeito magnético); a guia devolvida é desenhada só durante o gesto.
function snapAxis(position, size, canvasLength, targets, threshold) {
  const anchors = [position, position + size / 2, position + size];
  const lines = [0, canvasLength / 2, canvasLength];
  for (const target of targets) {
    lines.push(target.start, target.start + target.size / 2, target.start + target.size);
  }
  let best = null;
  for (const line of lines) {
    for (const anchor of anchors) {
      const distance = Math.abs(anchor - line);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { distance, line, offset: line - anchor };
      }
    }
  }
  if (!best) return { position, guide: null };
  return { position: roundGeometry(position + best.offset), guide: roundGeometry(best.line) };
}

export function computeSnap({ x, y, w, h, canvas, others = [], threshold = 6 }) {
  const [cw, ch] = canvas;
  const horizontal = snapAxis(x, w, cw, others.map((item) => ({ start: item.x, size: item.w })), threshold);
  const vertical = snapAxis(y, h, ch, others.map((item) => ({ start: item.y, size: item.h })), threshold);
  const guides = [];
  if (horizontal.guide !== null) guides.push({ axis: 'v', pos: horizontal.guide });
  if (vertical.guide !== null) guides.push({ axis: 'h', pos: vertical.guide });
  return { x: horizontal.position, y: vertical.position, guides };
}

export function serializeComposer(state) {
  const safe = cloneEditorState(state);
  delete safe.undoStack;
  delete safe.redoStack;
  delete safe.sel;
  delete safe.editing;
  return safe;
}

export function validateComposer(state) {
  const surface = getSurface(state.doc, state.format);
  const errors = [];
  if (!surface?.media) errors.push('Adicione uma mídia.');
  if (state.format === 'reel' && surface?.media) {
    const reel = validateReelMedia({ media: surface.media, video: state.doc.reel?.video });
    errors.push(...reel.errors);
  }
  if (state.format === 'carrossel' && state.doc.carrossel.slides.length < 2) {
    errors.push('O carrossel precisa de pelo menos 2 slides.');
  }
  if (
    state.format === 'carrossel'
    && state.doc.carrossel.slides.some((slide) => !slide.media)
  ) {
    errors.push('Adicione uma mídia em todos os slides do carrossel.');
  }
  if ((state.caption || '').length > 2200) errors.push('A legenda excede 2.200 caracteres.');
  const hashtagCount = String(state.hashtags || '').split(/[\s,]+/).filter(Boolean).length;
  if (hashtagCount > 30) errors.push('Use no máximo 30 hashtags.');
  return { ok: errors.length === 0, errors };
}

export function toApiFormat(format) {
  return ({ post: 'image', carrossel: 'carousel', story: 'stories', reel: 'reel' })[format] || 'image';
}
