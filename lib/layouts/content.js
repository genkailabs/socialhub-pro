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

// Palavras que nunca carregam a mensagem sozinhas. Destacar "para" ou "com" é
// pior que não destacar nada: pinta de cor justamente o que o olho ignora.
const STOPWORDS = new Set([
  'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'pra', 'com', 'sem', 'sob', 'sobre',
  'e', 'ou', 'mas', 'que', 'se', 'ao', 'aos', 'a', 'as', 'ja', 'nao', 'sim', 'mais',
  'seu', 'sua', 'seus', 'suas', 'meu', 'minha', 'este', 'esta', 'esse', 'essa',
  'isso', 'aquilo', 'como', 'quando', 'onde', 'ser', 'ter', 'foi', 'sao', 'esta', 'vai'
]);

/**
 * Aceita o destaque proposto e, se ele não servir, deriva um do título.
 *
 * O destaque só vale se for RECORTE do título: uma palavra que não está lá vira
 * um bloco de cor solto, e o título inteiro em destaque é o mesmo que destaque
 * nenhum. Quando a proposta falha nesses dois testes, a palavra mais longa fora
 * da lista de vazias é a melhor aposta determinística — não é escolha de gosto,
 * é a que costuma carregar o assunto.
 *
 * @param {string} proposed  o que a IA (ou a pessoa) escreveu.
 * @param {string} title     título da peça.
 */
export function resolveHighlight(proposed = '', title = '') {
  const clean = String(proposed || '').trim().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '');
  const source = String(title || '').trim();
  if (!source) return clean.split(/\s+/).slice(0, 3).join(' ');

  const words = source.split(/\s+/);
  const fits = clean
    && clean.split(/\s+/).length <= 3
    && !isSameText(clean, source)
    && deaccent(source).includes(deaccent(clean));
  if (fits) return clean;

  // Nada aproveitável: escolhe do próprio título. Palavras de 4+ letras fora da
  // lista de vazias, a mais longa vence; empate fica com a que aparece antes.
  const candidate = words
    .map((word) => ({ word, key: deaccent(word).replace(/[^a-z0-9]/g, '') }))
    .filter((item) => item.key.length >= 4 && !STOPWORDS.has(item.key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return candidate ? candidate.word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') : '';
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
    // O destaque nunca fica vazio quando há título: sem ele a peça sai plana e
    // as estruturas editoriais que exigem o campo ficam inelegíveis, que é
    // justamente como o Composer acabava sempre na mesma manchete.
    highlight: resolveHighlight(raw.highlight, title),
    footer: String(raw.footer || '').trim(),
    // §1.4: crédito da notícia. Vazio some junto com o slot, como qualquer campo.
    source: String(raw.source || '').trim(),
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
