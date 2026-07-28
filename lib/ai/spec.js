// Normaliza/valida a spec de post retornada pela IA (pura, testável).
import { TEMPLATES } from '@/lib/ai/templates';
import { jsonFromModelOutput } from '@/lib/ai/json';
import { normalizeHashtags, IG_CAPTION_MAX } from '@/lib/posts-media';

const clampStr = (s, n) => String(s ?? '').trim().slice(0, n);
export const DEFAULT_CTA = 'Salve este post para consultar depois.';

// Código único da falha de parsing. A interface nunca mostra a mensagem técnica
// (§8): ela troca pelo texto amigável e guarda isto no bloco de detalhes.
export const AI_INVALID_JSON = 'AI_INVALID_JSON';

// Campos que provam que o objeto é uma spec de conteúdo, e não um JSON
// qualquer que a IA devolveu ("{\"ok\":true}"). Sem esta checagem o
// normalizeSpec transformava lixo numa peça com "Sem título".
const SPEC_CONTENT_KEYS = [
  'headline', 'subtext', 'caption', 'bullets', 'cta',
  'image_title', 'imageTitle', 'image_prompt', 'imagePrompt', 'template'
];

function invalidSpec(reason, candidate) {
  const error = new Error('A IA não retornou JSON válido.');
  error.code = AI_INVALID_JSON;
  error.reason = reason;
  error.sample = typeof candidate === 'string' ? candidate.slice(0, 240) : '';
  return error;
}

/** §8: valida o schema esperado antes de normalizar. */
export function isSpecShape(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return SPEC_CONTENT_KEYS.some((key) => {
    const value = raw[key];
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'string' ? value.trim() !== '' : value != null;
  });
}

export function normalizeSpec(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const template = TEMPLATES.includes(o.template) ? o.template : 'news';
  const bullets = Array.isArray(o.bullets)
    ? o.bullets.map((b) => clampStr(b, 140)).filter(Boolean).slice(0, 6)
    : [];
  const isCarousel = template === 'tips_carousel';
  const imageText = typeof o.image_text === 'boolean'
    ? o.image_text
    : typeof o.imageText === 'boolean'
      ? o.imageText
      : ['news', 'promo', 'stat', 'tips_carousel'].includes(template);
  const imageTextPosition = ['top', 'center', 'bottom'].includes(o.image_text_position ?? o.imageTextPosition)
    ? (o.image_text_position ?? o.imageTextPosition)
    : 'bottom';
  const slidesRaw = Number(o.slides);
  const slides = isCarousel
    ? Math.max(2, Math.min(10, Number.isFinite(slidesRaw) ? slidesRaw : bullets.length + 1))
    : 1;

  return {
    template,
    headline: clampStr(o.headline, 120) || 'Sem título',
    subtext: clampStr(o.subtext, 220),
    bullets,
    caption: clampStr(o.caption, IG_CAPTION_MAX),
    cta: clampStr(o.cta, 160) || DEFAULT_CTA,
    hashtags: normalizeHashtags(o.hashtags),
    imagePrompt: clampStr(o.image_prompt ?? o.imagePrompt, 600),
    imageText,
    imageTitle: imageText ? (clampStr(o.image_title ?? o.imageTitle, 120) || clampStr(o.headline, 120)) : '',
    imageTextPosition,
    contentDetails: (o.content_details && typeof o.content_details === 'object' ? o.content_details : (o.contentDetails && typeof o.contentDetails === 'object' ? o.contentDetails : {})),
    slides
  };
}

export function parseSpec(jsonText) {
  // A extração (cerca de markdown, aspas curvas, vírgula sobrando, frase solta
  // em volta do objeto) é a mesma das skills e do Brand DNA — ver lib/ai/json.js.
  let raw;
  try {
    raw = jsonFromModelOutput(jsonText);
  } catch {
    throw invalidSpec('parse', jsonText);
  }
  if (!raw) throw invalidSpec('parse', jsonText);
  if (!isSpecShape(raw)) throw invalidSpec('schema', jsonText);
  return normalizeSpec(raw);
}
