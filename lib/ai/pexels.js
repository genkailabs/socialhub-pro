import 'server-only';

// Banco de imagens (PRD 02 §2/§3). Server-side: a chave nunca vai ao navegador.
//
// Pexels foi escolhido pela licença — uso comercial permitido, sem exigência de
// atribuição. Ainda assim guardamos autor e link da foto: o §13 cobra registrar
// origem e licença, e crédito é boa prática mesmo quando não é obrigação.

const BASE = 'https://api.pexels.com/v1/search';
const MAX_PER_PAGE = 40;

export const PEXELS_LICENSE = 'Pexels License — uso comercial permitido, atribuição não obrigatória';

export function hasPexelsKey() {
  return Boolean(String(process.env.PEXELS_API_KEY || '').trim());
}

// Erro tipado: sem chave não é falha de rede nem consulta ruim. Quem chama
// precisa saber que o caminho está desligado, não que a busca não achou nada.
export class StockUnavailableError extends Error {
  constructor(message = 'Busca de imagens não está configurada neste ambiente.') {
    super(message);
    this.name = 'StockUnavailableError';
    this.code = 'stock_unavailable';
  }
}

// O acervo não tem filtro nativo de "com pessoa" / "sem pessoa". Em vez de
// prometer um filtro que a API não tem, o termo entra na consulta — e a tela
// diz que é preferência, não garantia.
const PERSON_TERMS = { com: 'person people', sem: 'no people object' };

function normalize(photo) {
  return {
    id: String(photo.id),
    // O alt vem descrito pelo acervo e vira texto alternativo da peça.
    alt: photo.alt || '',
    width: photo.width,
    height: photo.height,
    avgColor: photo.avg_color || null,
    thumb: photo.src?.medium || photo.src?.small || '',
    preview: photo.src?.large || photo.src?.medium || '',
    full: photo.src?.original || photo.src?.large2x || '',
    // §13: origem e licença viajam com a imagem.
    source: 'pexels',
    sourceUrl: photo.url || '',
    photographer: photo.photographer || '',
    photographerUrl: photo.photographer_url || '',
    license: PEXELS_LICENSE
  };
}

/**
 * Busca no acervo.
 *
 * @param {object}  p
 * @param {string}  p.query        assunto já montado (ver lib/photo-direction).
 * @param {string}  p.orientation  'portrait' | 'landscape' | 'square' | ''
 * @param {string}  p.person       'com' | 'sem' | ''
 * @param {number}  p.perPage
 * @param {number}  p.page
 */
export async function pexelsSearch({ query, orientation = '', person = '', perPage = 24, page = 1 } = {}) {
  if (!hasPexelsKey()) throw new StockUnavailableError();

  const termo = [String(query || '').trim(), PERSON_TERMS[person] || ''].filter(Boolean).join(' ');
  if (!termo) return { photos: [], total: 0, page: 1 };

  const params = new URLSearchParams({
    query: termo,
    per_page: String(Math.min(MAX_PER_PAGE, Math.max(1, Number(perPage) || 24))),
    page: String(Math.max(1, Number(page) || 1)),
    locale: 'pt-BR'
  });
  if (orientation) params.set('orientation', orientation);

  const res = await fetch(`${BASE}?${params}`, {
    headers: { Authorization: String(process.env.PEXELS_API_KEY).trim() },
    cache: 'no-store'
  });

  if (res.status === 429) throw new StockUnavailableError('O banco de imagens atingiu o limite de consultas. Tente em alguns minutos.');
  if (!res.ok) throw new StockUnavailableError(`Busca de imagens indisponível (HTTP ${res.status}).`);

  const data = await res.json().catch(() => ({}));
  return {
    photos: (data.photos || []).map(normalize),
    total: Number(data.total_results) || 0,
    page: Number(data.page) || 1
  };
}
