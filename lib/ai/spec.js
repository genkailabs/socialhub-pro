// Normaliza/valida a spec de post retornada pela IA (pura, testável).
import { TEMPLATES } from '@/lib/ai/templates';
import { normalizeHashtags, IG_CAPTION_MAX } from '@/lib/posts-media';

const clampStr = (s, n) => String(s ?? '').trim().slice(0, n);
export const DEFAULT_CTA = 'Salve este post para consultar depois.';

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
  const text = typeof jsonText === 'string' ? jsonText.trim() : jsonText;
  const fenced = typeof text === 'string' ? text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i) : null;
  const candidate = fenced?.[1]?.trim() || text;
  let raw;
  try {
    raw = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
  } catch {
    // Alguns provedores acrescentam uma frase antes ou depois do objeto. O
    // restante do sistema já aceita essa variação; o Composer deve fazer o mesmo.
    const repaired = typeof candidate === 'string'
      ? candidate
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
      : candidate;
    const start = typeof repaired === 'string' ? repaired.indexOf('{') : -1;
    const end = typeof repaired === 'string' ? repaired.lastIndexOf('}') : -1;
    try {
      raw = start >= 0 && end > start ? JSON.parse(repaired.slice(start, end + 1)) : null;
    } catch {
      throw new Error('A IA não retornou JSON válido.');
    }
    if (!raw) throw new Error('A IA não retornou JSON válido.');
  }
  return normalizeSpec(raw);
}
