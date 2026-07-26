import 'server-only';

const TEXT_LIMITS = { title: 280, publisher: 280, summary: 2000, author: 280, license: 280, source: 280 };

function text(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function normalizedHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    [...url.searchParams.keys()].forEach((key) => {
      if (/^utm_/i.test(key)) url.searchParams.delete(key);
    });
    return url.toString();
  } catch {
    return null;
  }
}

function validDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

function invalid(reason) {
  return { ok: false, reason, sources: [], images: [] };
}

function normalizeSource(record) {
  const url = normalizedHttpUrl(record?.url || record?.uri);
  if (!url) return invalid('invalid-source-url');
  const title = text(record?.title, TEXT_LIMITS.title);
  if (!title) return invalid('missing-source-title');
  const publisher = text(record?.publisher, TEXT_LIMITS.publisher);
  if (!publisher) return invalid('missing-source-publisher');
  const publishedAt = validDate(record?.publishedAt);
  if (!publishedAt) return invalid('missing-source-published-at');
  const consultedAt = validDate(record?.consultedAt);
  if (!consultedAt) return invalid('missing-source-consulted-at');
  const summary = text(record?.summary, TEXT_LIMITS.summary);
  if (!summary) return invalid('missing-source-summary');
  return { ok: true, source: { url, title, publisher, publishedAt, consultedAt, summary } };
}

function normalizeImage(record) {
  const imageUrl = normalizedHttpUrl(record?.imageUrl);
  if (!imageUrl) return invalid('invalid-image-url');
  const isAi = record?.kind === 'ai' || record?.source === 'ai' || record?.generated === true;
  if (isAi) return { ok: true, image: { imageUrl, kind: 'ai', source: 'ai', generated: true } };

  const sourceUrl = normalizedHttpUrl(record?.sourceUrl);
  if (!sourceUrl) return invalid('invalid-image-source-url');
  const author = text(record?.author, TEXT_LIMITS.author);
  if (!author) return invalid('missing-image-author');
  const license = text(record?.license, TEXT_LIMITS.license);
  if (!license) return invalid('missing-image-license');
  const source = text(record?.source, TEXT_LIMITS.source);
  if (!source) return invalid('missing-image-source');
  return { ok: true, image: { imageUrl, sourceUrl, author, license, source, kind: 'external' } };
}

// Validates provider output before it is persisted or fed to the generator.
// The return value is JSON-safe and deliberately excludes unknown fields.
export function validateContentSources({ sources = [], images = [] } = {}) {
  if (!Array.isArray(sources) || !sources.length) return invalid('missing-sources');
  if (!Array.isArray(images)) return invalid('invalid-images');

  const normalizedSources = [];
  const urls = new Set();
  for (const record of sources) {
    const result = normalizeSource(record);
    if (!result.ok) return result;
    if (urls.has(result.source.url)) return invalid('duplicate-source-url');
    urls.add(result.source.url);
    normalizedSources.push(result.source);
  }

  const normalizedImages = [];
  const imageUrls = new Set();
  for (const record of images) {
    const result = normalizeImage(record);
    if (!result.ok) return result;
    if (imageUrls.has(result.image.imageUrl)) return invalid('duplicate-image-url');
    imageUrls.add(result.image.imageUrl);
    normalizedImages.push(result.image);
  }

  return { ok: true, sources: normalizedSources, images: normalizedImages };
}
