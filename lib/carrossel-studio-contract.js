// Contrato V1 do iframe Carrossel Studio. Este arquivo só contém validação e
// montagem de mensagens, portanto pode ser coberto por testes sem navegador.
export const CAROUSEL_STUDIO_PROTOCOL_VERSION = 1;

function record(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function string(value, max = 200) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function arrayBuffer(value) {
  return value instanceof ArrayBuffer;
}

function safeWebUrl(value) {
  if (!string(value, 2048)) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function safeTempPath(value) {
  return typeof value === 'string'
    && value.length <= 500
    && /^temp\/[a-z0-9_-]+\/[a-z0-9._-]+$/i.test(value);
}

export function safeStudioInitialMedia(items) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!record(item) || !safeWebUrl(item.url)) return [];
    const safe = { url: item.url, kind: 'image' };
    if (safeTempPath(item.path)) safe.path = item.path;
    if (typeof item.altText === 'string' && item.altText.trim()) safe.altText = item.altText.trim().slice(0, 240);
    if (Number.isInteger(item.slideOrder) && item.slideOrder >= 1 && item.slideOrder <= 9) {
      safe.slot = item.slideOrder - 1;
    }
    return [safe];
  }).slice(0, 9);
}

export function studioOrigin(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function createStudioChannelId() {
  if (!globalThis.crypto?.getRandomValues) {
    return `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
  const values = new Uint32Array(2);
  globalThis.crypto.getRandomValues(values);
  return `cs-${values[0].toString(36)}${values[1].toString(36)}`;
}

export function isStudioReady(message) {
  return record(message)
    && message.type === 'cs:ready'
    && message.version === CAROUSEL_STUDIO_PROTOCOL_VERSION;
}

export function isStudioMessage(message, channelId) {
  if (!record(message)
    || message.version !== CAROUSEL_STUDIO_PROTOCOL_VERSION
    || message.channelId !== channelId) return false;

  if (message.type === 'cs:change') return record(message.doc);
  if (message.type === 'cs:close') return true;
  if (message.type === 'cs:error') return string(message.code, 80) && string(message.message, 300);
  if (message.type === 'cs:media-request') {
    const file = message.file;
    return string(message.requestId, 160)
      && record(file)
      && string(file.name, 180)
      && string(file.type, 120)
      && /^(image\/|video\/(mp4|webm)$|application\/zip$)/.test(file.type)
      && Number.isInteger(file.size)
      && file.size > 0
      && file.size <= 100 * 1024 * 1024
      && arrayBuffer(file.bytes)
      && file.bytes.byteLength === file.size;
  }
  if (message.type === 'cs:media-delete-request') {
    return string(message.requestId, 160) && safeTempPath(message.path);
  }
  // Clique dentro do iframe. É o que permite ao host abrir a dica de foto do
  // slide aberto: sem esta mensagem, seleção no canvas é invisível daqui.
  if (message.type === 'cs:selection') {
    return Number.isInteger(message.slideIndex)
      && message.slideIndex >= 0
      && message.slideIndex <= 9
      && (message.elementId === null || string(message.elementId, 120))
      && (message.elementType === null || string(message.elementType, 40))
      && (message.slot === undefined || (Number.isInteger(message.slot) && message.slot >= 0 && message.slot <= 8));
  }
  if (message.type === 'cs:export') {
    return record(message.doc)
      && Array.isArray(message.images)
      && message.images.length > 0
      && message.images.length <= 10
      && message.images.every((image) => record(image)
        && string(image.name, 180)
        && typeof image.dataUrl === 'string'
        && image.dataUrl.startsWith('data:image/'));
  }
  return false;
}

export function studioMediaMessage({ channelId, requestId, item }) {
  return {
    type: 'cs:media',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    requestId,
    items: [item]
  };
}

export function studioMediaDeleteAckMessage({ channelId, requestId, path }) {
  return {
    type: 'cs:media-delete-ack',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    requestId: typeof requestId === 'string' ? requestId.slice(0, 160) : undefined,
    path: safeTempPath(path) ? path : undefined
  };
}

/** Só 'light' e 'dark' atravessam a ponte; qualquer outra coisa vira escuro. */
export function safeStudioTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

export function studioInitMessage({ channelId, title, doc, brand, templateId, slideCount, script, initialMedia, theme }) {
  const media = safeStudioInitialMedia(initialMedia);
  return {
    type: 'cs:init',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    title: typeof title === 'string' ? title.slice(0, 180) : undefined,
    doc: record(doc) ? doc : null,
    brand: record(brand) ? brand : undefined,
    templateId: typeof templateId === 'string' ? templateId.slice(0, 120) : undefined,
    slideCount: Number.isInteger(slideCount) && slideCount >= 2 && slideCount <= 10 ? slideCount : undefined,
    script: typeof script === 'string' ? script.slice(0, 12000) : undefined,
    media: media.length ? media : undefined,
    theme: safeStudioTheme(theme)
  };
}

/**
 * Troca de tema depois do init. O tema entra no `cs:init` para o Studio já
 * abrir certo, mas o Hub troca de tema sem recarregar o iframe — sem esta
 * mensagem o editor ficaria escuro dentro de uma tela clara até um F5.
 */
export function studioThemeMessage({ channelId, theme }) {
  return {
    type: 'cs:theme',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    theme: safeStudioTheme(theme)
  };
}

export function studioDraftSavedMessage({ channelId, draftId }) {
  return {
    type: 'cs:draft-saved',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    draftId: typeof draftId === 'string' ? draftId : undefined
  };
}

export function studioErrorMessage({ channelId, code, message, requestId }) {
  return {
    type: 'cs:error',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    code: String(code || 'host_error').slice(0, 80),
    message: String(message || 'Ocorreu um erro no host.').slice(0, 300),
    ...(typeof requestId === 'string' ? { requestId: requestId.slice(0, 160) } : {})
  };
}
