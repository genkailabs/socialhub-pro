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

// Lê o estado do reel a partir do documento do Composer, sempre normalizado.
export function getReelState(doc) {
  return normalizeReelState(doc?.reel);
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
