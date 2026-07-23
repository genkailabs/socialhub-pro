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
  if ((state.caption || '').length > 2200) errors.push('A legenda excede 2.200 caracteres.');
  const hashtagCount = String(state.hashtags || '').split(/[\s,]+/).filter(Boolean).length;
  if (hashtagCount > 30) errors.push('Use no máximo 30 hashtags.');
  return { ok: errors.length === 0, errors };
}

export function toApiFormat(format) {
  return ({ post: 'image', carrossel: 'carousel', story: 'stories', reel: 'reel' })[format] || 'image';
}

