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

// Verifica se um caminho ou URL pertence ao diretório temporário
export function isTempMediaPath(pathOrUrl = '') {
  return Boolean(extractTempMediaPath(pathOrUrl));
}

export function extractTempMediaPath(pathOrUrl = '') {
  if (typeof pathOrUrl !== 'string' || !pathOrUrl.trim()) return null;
  const clean = pathOrUrl.trim().split('?')[0];
  if (clean.startsWith('temp/')) return clean;

  const prefixes = [
    '/storage/v1/object/public/media/',
    '/storage/v1/object/sign/media/',
    '/storage/v1/object/media/'
  ];
  for (const prefix of prefixes) {
    const index = clean.indexOf(prefix);
    if (index === -1) continue;
    const path = clean.slice(index + prefix.length).replace(/^\/+/, '');
    return path.startsWith('temp/') ? path : null;
  }
  return null;
}

export async function removeTempMedia(supabase, candidates = []) {
  if (!supabase?.storage) return { ok: false, paths: [], error: 'Cliente Supabase inválido.' };
  const values = Array.isArray(candidates) ? candidates : [candidates];
  const paths = [...new Set(values.map(extractTempMediaPath).filter(Boolean))];
  if (!paths.length) return { ok: true, paths: [] };

  const { error } = await supabase.storage.from('media').remove(paths);
  if (error) return { ok: false, paths, error: error.message || 'Falha ao remover mídia temporária.' };
  return { ok: true, paths };
}

// Upload temporário para mídias de Story e Reel no bucket 'media'
export async function uploadTempMedia(supabase, brandId, file) {
  if (!supabase || !brandId || !file) throw new Error('Parâmetros inválidos para upload temporário.');
  const ext = (file.name?.split('.').pop() || 'mp4').toLowerCase();
  const path = `temp/${brandId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    upsert: true,
    contentType: file.type
  });
  if (error) throw new Error(`Falha no upload temporário: ${error.message}`);
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

// Calcula data de exclusão automática com base no status do post e timestamps (§17.8 do PRD)
export function calculateDeleteAfter(status, publishedAt, updatedAt) {
  const getBaseTime = (val) => {
    if (val !== undefined && val !== null) {
      const ms = new Date(val).getTime();
      if (!isNaN(ms)) return ms;
    }
    return Date.now();
  };

  if (['draft', 'awaiting_approval', 'waiting_approval', 'ready_to_post'].includes(status)) {
    return new Date(getBaseTime(updatedAt) + 30 * 24 * 3600 * 1000).toISOString();
  }
  if (['scheduled'].includes(status)) {
    return null;
  }
  if (['published', 'posted_manually'].includes(status)) {
    return new Date(getBaseTime(publishedAt)).toISOString();
  }
  if (['failed', 'error'].includes(status)) {
    return new Date(getBaseTime(updatedAt) + 7 * 24 * 3600 * 1000).toISOString();
  }
  if (['cancelled'].includes(status)) {
    return new Date(getBaseTime(updatedAt) + 3600 * 1000).toISOString();
  }
  return null;
}

