import 'server-only';

import { randomUUID } from 'node:crypto';
import { pollinationsImage } from '@/lib/ai/pollinations-image';
import { cleanOrphanedTempMedia } from '@/lib/media-cleanup';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASPECT_RATIOS = Object.freeze({
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 }
});

export const CAROUSEL_IMAGE_TEMP_RETENTION_HOURS = 24;
export const CAROUSEL_IMAGE_LIFECYCLE = Object.freeze({
  bucket: 'media',
  pathTemplate: 'temp/<brandId>/<generated-file>',
  permanentDatabaseRecord: false,
  expiresAfterHours: CAROUSEL_IMAGE_TEMP_RETENTION_HOURS,
  cleanupHelper: 'cleanOrphanedTempMedia'
});

export class CarouselImageError extends Error {
  constructor(message, { status = 400, code = 'invalid_request' } = {}) {
    super(message);
    this.name = 'CarouselImageError';
    this.status = status;
    this.code = code;
  }
}

function requiredText(value, label, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    throw new CarouselImageError(`${label} inválido.`);
  }
  return text;
}

export function validateCarouselImageInput(input) {
  const brandId = typeof input?.brandId === 'string' ? input.brandId.trim() : '';
  if (!UUID_PATTERN.test(brandId)) throw new CarouselImageError('Marca inválida.');

  const headline = requiredText(input?.slide?.headline, 'Título do slide', 160);
  const body = typeof input?.slide?.body === 'string' ? input.slide.body.trim() : '';
  if (body.length > 1200 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body)) {
    throw new CarouselImageError('Texto do slide inválido.');
  }
  const style = requiredText(input?.style, 'Estilo visual', 120);
  const aspectRatio = typeof input?.aspectRatio === 'string' ? input.aspectRatio.trim() : '';
  if (!ASPECT_RATIOS[aspectRatio]) {
    throw new CarouselImageError('Proporção inválida. Use 1:1, 4:5 ou 9:16.');
  }

  return { brandId, slide: { headline, body }, style, aspectRatio };
}

function compact(value, maxLength = 120) {
  if (Array.isArray(value)) value = value.join(', ');
  if (value && typeof value === 'object') value = JSON.stringify(value);
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function buildCarouselImagePrompt({ brand, kit, slide, style, aspectRatio }) {
  const identity = [
    compact(brand?.name, 60) && `brand ${compact(brand.name, 60)}`,
    compact(kit?.niche || brand?.category, 80) && `niche ${compact(kit?.niche || brand?.category, 80)}`,
    compact(kit?.audience, 80) && `audience ${compact(kit.audience, 80)}`,
    compact(kit?.tone, 60) && `tone ${compact(kit.tone, 60)}`,
    compact(kit?.visual_style, 80) && `brand visual style ${compact(kit.visual_style, 80)}`,
    compact(kit?.palette, 80) && `palette ${compact(kit.palette, 80)}`
  ].filter(Boolean).join('; ').slice(0, 90);

  return [
    'Create original, rights-safe social carousel artwork. Do not render words, letters, logos, watermarks, UI, signatures, or copyrighted characters.',
    `Style: ${compact(style, 60)}. Ratio: ${aspectRatio}. Premium composition with a strong focal point.`,
    `Visual concept: ${compact(slide.headline, 100)}; ${compact(slide.body, 120)}.`,
    identity && `Brand cues: ${identity}.`
  ].filter(Boolean).join(' ').slice(0, 600);
}

function imageExtension(contentType) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

function publicUrlFor(storage, path) {
  const result = storage.getPublicUrl(path);
  return result?.data?.publicUrl || '';
}

export async function generateCarouselImage({ supabase, userId, input, imageProvider = pollinationsImage }) {
  if (!supabase || !userId) {
    throw new CarouselImageError('Sessão expirada.', { status: 401, code: 'unauthorized' });
  }
  const parsed = validateCarouselImageInput(input);

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, category, color')
    .eq('id', parsed.brandId)
    .eq('user_id', userId)
    .maybeSingle();
  if (brandError) {
    throw new CarouselImageError('Não foi possível confirmar a marca agora.', { status: 502, code: 'brand_lookup_failed' });
  }
  if (!brand) {
    throw new CarouselImageError('Marca inválida ou sem acesso.', { status: 403, code: 'brand_forbidden' });
  }

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('niche, audience, tone, palette, visual_style')
    .eq('brand_id', parsed.brandId)
    .maybeSingle();
  const prompt = buildCarouselImagePrompt({ brand, kit, ...parsed });
  const dimensions = ASPECT_RATIOS[parsed.aspectRatio];

  let generated;
  try {
    generated = await imageProvider({ prompt, ...dimensions });
  } catch {
    throw new CarouselImageError('Não foi possível gerar a imagem agora. Tente novamente.', { status: 502, code: 'generation_failed' });
  }
  if (!Buffer.isBuffer(generated?.bytes) || !generated.bytes.length || !String(generated?.contentType || '').startsWith('image/')) {
    throw new CarouselImageError('O gerador não devolveu uma imagem válida. Tente novamente.', { status: 502, code: 'invalid_image' });
  }

  const path = `temp/${parsed.brandId}/${Date.now()}-${randomUUID()}-carousel-ai.${imageExtension(generated.contentType)}`;
  const storage = supabase.storage.from(CAROUSEL_IMAGE_LIFECYCLE.bucket);
  const { error: uploadError } = await storage.upload(path, generated.bytes, {
    contentType: generated.contentType,
    cacheControl: '3600',
    upsert: false
  });
  if (uploadError) {
    throw new CarouselImageError('A imagem foi gerada, mas não foi possível salvá-la. Tente novamente.', { status: 502, code: 'upload_failed' });
  }

  const url = publicUrlFor(storage, path);
  if (!url) {
    throw new CarouselImageError('A imagem foi salva, mas o link não ficou disponível.', { status: 502, code: 'url_unavailable' });
  }

  const altText = `${parsed.slide.headline} — imagem ${parsed.style} para ${brand.name}`.slice(0, 240);
  return { url, path, model: String(generated.model || 'pollinations'), altText };
}

// Contrato operacional: imagens ainda não ligadas a um post são órfãs em
// media/temp e entram na mesma coleta segura já usada pelo Composer após 24h.
export async function cleanExpiredCarouselImages({ supabase, dryRun } = {}) {
  return cleanOrphanedTempMedia({
    supabase,
    maxAgeHours: CAROUSEL_IMAGE_TEMP_RETENTION_HOURS,
    dryRun
  });
}
