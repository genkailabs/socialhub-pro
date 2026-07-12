// Normaliza/valida a spec de post retornada pela IA (pura, testável).
import { TEMPLATES } from '@/lib/ai/templates';
import { normalizeHashtags, IG_CAPTION_MAX } from '@/lib/posts-media';

const clampStr = (s, n) => String(s ?? '').trim().slice(0, n);

export function normalizeSpec(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const template = TEMPLATES.includes(o.template) ? o.template : 'quote';
  const bullets = Array.isArray(o.bullets)
    ? o.bullets.map((b) => clampStr(b, 140)).filter(Boolean).slice(0, 6)
    : [];
  const isCarousel = template === 'tips_carousel';
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
    hashtags: normalizeHashtags(o.hashtags),
    slides
  };
}

export function parseSpec(jsonText) {
  let raw;
  try {
    raw = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
  } catch {
    throw new Error('A IA não retornou JSON válido.');
  }
  return normalizeSpec(raw);
}
