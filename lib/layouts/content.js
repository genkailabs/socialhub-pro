// Tradução do conteúdo para os campos dos componentes (§5). Puro, sem I/O.
//
// A IA de texto e o Composer falam dialetos diferentes: a spec traz
// `headline`/`subtext`, o planejamento traz `topic`, o editor traz `caption`.
// Sem um tradutor único, cada tela derivaria os campos do seu jeito e a mesma
// notícia sairia com título diferente em cada caminho.

import { deaccent } from '@/lib/layouts/styles';

const EYEBROW_BY_TYPE = {
  noticia: 'Notícia',
  educativo: 'Dica',
  dado: 'Números',
  inspiracao: 'Inspiração',
  engajamento: 'Pergunta',
  promocao: 'Oferta',
  servico: 'Aviso',
  autoridade: 'Bastidores'
};

// Primeiro número com unidade que apareça no texto — é o que o layout de
// estatística coloca em corpo grande.
const STAT_PATTERN = /(\d{1,3}(?:[.,]\d+)?\s*%|R\$\s?\d[\d.,]*|\d{1,3}(?:[.,]\d+)?\s?(?:mil|milh(?:ão|oes|ões)|bi))/i;

export function extractStat(text = '') {
  const match = String(text || '').match(STAT_PATTERN);
  return match ? match[0].replace(/\s+/g, ' ').trim() : '';
}

/**
 * Normaliza qualquer origem de conteúdo para os campos que os componentes leem.
 *
 * @param {object} raw   spec da IA, item do planejamento ou campos do editor.
 * @param {object} extra { contentType, brand } quando já conhecidos.
 */
export function normalizeLayoutContent(raw = {}, { contentType = null, brand = '' } = {}) {
  const title = String(raw.title || raw.headline || raw.imageTitle || raw.topic || '').trim();
  const subtitle = String(raw.subtitle || raw.subtext || raw.summary || '').trim();
  const bullets = (Array.isArray(raw.bullets) ? raw.bullets : []).map((item) => String(item || '').trim()).filter(Boolean);
  const cta = String(raw.cta || '').trim();

  const question = String(raw.question || (title.trim().endsWith('?') ? title : '')).trim();
  const stat = String(raw.stat || extractStat(title) || extractStat(subtitle)).trim();

  return {
    title,
    subtitle,
    bullets,
    cta,
    brand: String(raw.brand || brand || '').replace(/^@/, '').trim(),
    eyebrow: String(raw.eyebrow || (contentType ? EYEBROW_BY_TYPE[contentType] : '') || '').trim(),
    quote: String(raw.quote || '').trim(),
    question,
    stat,
    // A legenda do número explica o dado; sem legenda própria, o texto de apoio
    // faz esse papel — melhor que um número solto no quadro.
    statLabel: String(raw.statLabel || subtitle || '').trim(),
    warning: String(raw.warning || '').trim(),
    // Repetição é resolvida na montagem: se o mesmo texto já entrou em outro
    // slot, o segundo é descartado (ver buildLayoutSurface).
    info: String(raw.info || subtitle || '').trim(),
    highlight: String(raw.highlight || '').trim(),
    footer: String(raw.footer || '').trim(),
    date: String(raw.date || '').trim(),
    slideNumber: String(raw.slideNumber || '').trim(),
    contentType: raw.contentType || contentType || null,
    caption: String(raw.caption || '').trim(),
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : []
  };
}

// Rótulo curto do tipo, usado no selo quando o conteúdo não trouxe um.
export function eyebrowForType(contentType) {
  return EYEBROW_BY_TYPE[contentType] || '';
}

export function isSameText(a, b) {
  return deaccent(String(a || '')).replace(/\W+/g, '') === deaccent(String(b || '')).replace(/\W+/g, '');
}
