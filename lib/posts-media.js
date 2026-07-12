// Regras puras de mídia p/ publicação no Instagram (sem I/O — testável).
export const IG_CAROUSEL_MIN = 2;
export const IG_CAROUSEL_MAX = 10;
export const IG_CAPTION_MAX = 2200;

// Aceita array de URLs ou uma única string; remove vazios/espaços.
export function cleanUrls(urls) {
  if (Array.isArray(urls)) return urls.map((u) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
  if (typeof urls === 'string' && urls.trim()) return [urls.trim()];
  return [];
}

// 'carousel' quando há 2+ imagens, senão 'image'.
export function mediaKind(urls) {
  return cleanUrls(urls).length >= IG_CAROUSEL_MIN ? 'carousel' : 'image';
}

// Valida o conjunto de imagens p/ o feed do Instagram.
export function validateInstagramMedia(urls) {
  const u = cleanUrls(urls);
  if (u.length === 0) return { ok: false, error: 'Envie ao menos uma imagem (o Instagram exige mídia).' };
  if (u.length > IG_CAROUSEL_MAX) return { ok: false, error: `Carrossel do Instagram aceita no máximo ${IG_CAROUSEL_MAX} imagens.` };
  return { ok: true, kind: mediaKind(u), urls: u };
}

// Junta legenda + hashtags respeitando o limite do IG. Hashtags aceitam
// string ("#a #b" ou "a, b") ou array; normaliza p/ "#tag".
export function normalizeHashtags(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[\s,]+/);
  const seen = new Set();
  const tags = [];
  for (const t of raw) {
    const clean = String(t).trim().replace(/^#+/, '');
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push('#' + clean);
  }
  return tags;
}

export function composeCaption(caption = '', hashtags) {
  const tags = normalizeHashtags(hashtags);
  const base = String(caption || '').trim();
  const full = tags.length ? `${base}\n\n${tags.join(' ')}`.trim() : base;
  return full.slice(0, IG_CAPTION_MAX);
}
