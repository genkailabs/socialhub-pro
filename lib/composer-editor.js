export const COMPOSER_FORMATS = {
  post: { label: 'Post', ratios: { '1:1': [430, 430], '4:5': [384, 480], '1.91:1': [600, 314] } },
  carrossel: { label: 'Carrossel', ratios: { '1:1': [420, 420] } },
  story: { label: 'Story', ratios: { '9:16': [292, 519] } },
  reel: { label: 'Reel', ratios: { '9:16': [292, 519] } }
};

export function makeSurface(media = null) {
  return { media, bg: { x: 0, y: 0, scale: 1, rot: 0 }, layers: [] };
}

export function makeComposerDocument() {
  return {
    post: makeSurface(),
    carrossel: { slides: [makeSurface(), makeSurface()], active: 0 },
    story: makeSurface(),
    reel: { ...makeSurface(), cover: 0 }
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

export function fitMediaToCanvas({ width, height } = {}, canvas = [430, 430]) {
  const naturalWidth = Math.max(1, Number(width) || canvas[0]);
  const naturalHeight = Math.max(1, Number(height) || canvas[1]);
  const [cw, ch] = canvas;
  const containScale = Math.min(cw / naturalWidth, ch / naturalHeight);
  const w = Math.max(1, Math.round(naturalWidth * containScale));
  const h = Math.max(1, Math.round(naturalHeight * containScale));
  return {
    x: roundGeometry((cw - w) / 2),
    y: roundGeometry((ch - h) / 2),
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

export function mediaTransformStyle(transform, media, canvas) {
  const value = normalizeMediaTransform(transform, media, canvas);
  return {
    left: value.x,
    top: value.y,
    width: value.w * value.scale,
    height: value.h * value.scale,
    transform: `rotate(${value.rot}deg)`
  };
}

export function addLayer(surface, preset, canvas = [430, 430], id = `l${Date.now().toString(36)}`) {
  const defaults = {
    id, type: 'text', text: 'Novo texto', x: canvas[0] / 2 - 90, y: canvas[1] / 2 - 24,
    w: 180, h: 48, fs: 28, weight: 700, italic: false, align: 'center',
    color: '#FFFFFF', fill: '#007AFF', font: 'system-ui', rot: 0, op: 1,
    hidden: false, locked: false, radius: 10
  };
  const layer = { ...defaults, ...preset, id };
  surface.layers.push(layer);
  return layer;
}

export function snapPosition({ x, y, w, h, canvas, threshold = 7, margin = 24 }) {
  let nextX = x;
  let nextY = y;
  let guideV = false;
  let guideH = false;
  const [cw, ch] = canvas;
  if (Math.abs(x + w / 2 - cw / 2) <= threshold) {
    nextX = cw / 2 - w / 2;
    guideV = true;
  } else if (Math.abs(x - margin) <= threshold) nextX = margin;
  else if (Math.abs(x + w - (cw - margin)) <= threshold) nextX = cw - margin - w;
  if (Math.abs(y + h / 2 - ch / 2) <= threshold) {
    nextY = ch / 2 - h / 2;
    guideH = true;
  } else if (Math.abs(y - margin) <= threshold) nextY = margin;
  else if (Math.abs(y + h - (ch - margin)) <= threshold) nextY = ch - margin - h;
  return { x: nextX, y: nextY, guideV, guideH };
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
