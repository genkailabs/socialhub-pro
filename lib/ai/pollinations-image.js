import 'server-only';

// Geração de IMAGEM via Pollinations (gen.pollinations.ai). Substitui a deAPI.
// Só imagem — o texto/prompt continua vindo do DeepSeek. Server-side.
// GET /image/{prompt}?width&height&model&nologo — resposta são os bytes direto.
const BASE = 'https://gen.pollinations.ai/image';
export const POLLINATIONS_IMAGE_MODEL = process.env.POLLINATIONS_IMAGE_MODEL || 'flux';

const DIM = Number(process.env.POLLINATIONS_IMAGE_SIZE) || 1080;

export function hasPollinationsKey() {
  const key = process.env.POLLINATIONS_SECRET_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

// Gera 1 imagem e devolve os bytes prontos p/ subir no storage.
export async function pollinationsImage({ prompt, model = POLLINATIONS_IMAGE_MODEL, width = DIM, height = DIM }) {
  const key = (process.env.POLLINATIONS_SECRET_KEY || '').trim();
  if (!key) throw new Error('POLLINATIONS_SECRET_KEY não configurada no servidor.');
  if (!prompt || !String(prompt).trim()) throw new Error('Pollinations: prompt de imagem vazio.');

  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    nologo: 'true',
    seed: String(Math.floor(Math.random() * 1e9))
  });
  const url = `${BASE}/${encodeURIComponent(String(prompt))}?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Pollinations imagem: falha na geração (HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}).`);
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { bytes: Buffer.from(await res.arrayBuffer()), contentType, model };
}
