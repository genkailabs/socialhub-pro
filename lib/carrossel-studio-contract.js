// Contrato V1 do iframe Carrossel Studio. Este arquivo só contém validação e
// montagem de mensagens, portanto pode ser coberto por testes sem navegador.
export const CAROUSEL_STUDIO_PROTOCOL_VERSION = 1;

function record(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function string(value, max = 200) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
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

export function studioInitMessage({ channelId, title, doc, brand, templateId, slideCount, script }) {
  return {
    type: 'cs:init',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    title: typeof title === 'string' ? title.slice(0, 180) : undefined,
    doc: record(doc) ? doc : null,
    brand: record(brand) ? brand : undefined,
    templateId: typeof templateId === 'string' ? templateId.slice(0, 120) : undefined,
    slideCount: Number.isInteger(slideCount) && slideCount >= 2 && slideCount <= 10 ? slideCount : undefined,
    script: typeof script === 'string' ? script.slice(0, 12000) : undefined
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

export function studioErrorMessage({ channelId, code, message }) {
  return {
    type: 'cs:error',
    version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
    channelId,
    code: String(code || 'host_error').slice(0, 80),
    message: String(message || 'Ocorreu um erro no host.').slice(0, 300)
  };
}
