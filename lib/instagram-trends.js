const METRIC_CLAIM = /(?:\b\d+(?:[.,]\d+)?\s*%|\b\d+(?:[.,]\d+)?\s*(?:mil(?:h(?:ão|ões))?|vezes|visualiza(?:ção|ções)|seguidores?)\b|\b\d+(?:[.,]\d+)?x\b)/i;

export const TREND_TAXONOMY = Object.freeze({
  category: ['educacao', 'autoridade', 'bastidores', 'comunidade', 'oferta'],
  profession: ['geral', 'servicos', 'saude', 'educacao', 'comercio', 'tecnologia', 'criadores'],
  format: ['carrossel', 'reel', 'stories', 'imagem'],
  status: ['consolidando', 'emergente', 'acompanhar'],
  priority: ['aplicar-agora', 'adaptar', 'observar']
});

export const TREND_LABELS = Object.freeze({
  category: { educacao: 'Educação', autoridade: 'Autoridade', bastidores: 'Bastidores', comunidade: 'Comunidade', oferta: 'Oferta' },
  profession: { geral: 'Todas', servicos: 'Serviços', saude: 'Saúde', educacao: 'Educação', comercio: 'Comércio', tecnologia: 'Tecnologia', criadores: 'Criadores' },
  format: { carrossel: 'Carrossel', reel: 'Reel', stories: 'Stories', imagem: 'Imagem' },
  status: { consolidando: 'Consolidando', emergente: 'Emergente', acompanhar: 'Acompanhar' },
  priority: { 'aplicar-agora': 'Aplicar agora', adaptar: 'Adaptar à marca', observar: 'Observar' }
});

const PRIORITY_ORDER = Object.freeze({ 'aplicar-agora': 0, adaptar: 1, observar: 2 });
const STATUS_ORDER = Object.freeze({ consolidando: 0, emergente: 1, acompanhar: 2 });

function text(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function slug(value) {
  return text(value, 100)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tendencia';
}

export function hasMetricClaim(value) {
  return METRIC_CLAIM.test(String(value || ''));
}

export function normalizeTrends(rawTrends, sources) {
  const sourceIds = new Set((Array.isArray(sources) ? sources : []).map((source) => source.id));
  const usedIds = new Set();

  return (Array.isArray(rawTrends) ? rawTrends : []).flatMap((trend, index) => {
    const evidence = (Array.isArray(trend?.sourceIds) ? trend.sourceIds : [])
      .filter((id, position, all) => sourceIds.has(id) && all.indexOf(id) === position)
      .slice(0, 3);
    const copy = [
      trend?.title,
      trend?.summary,
      trend?.mechanic,
      trend?.howTo,
      trend?.carouselTheme,
      trend?.carouselPrompt
    ].join(' ');
    if (!evidence.length || hasMetricClaim(copy)) return [];

    const baseId = slug(trend.title);
    const id = usedIds.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    usedIds.add(id);
    return [{
      id,
      title: text(trend.title, 100),
      summary: text(trend.summary, 280),
      category: trend.category,
      profession: trend.profession,
      format: trend.format,
      status: trend.status,
      priority: trend.priority,
      mechanic: text(trend.mechanic, 500),
      howTo: text(trend.howTo, 700),
      carouselTheme: text(trend.carouselTheme, 180),
      carouselPrompt: text(trend.carouselPrompt, 900),
      sourceIds: evidence
    }];
  }).filter((trend) => trend.title && trend.summary && trend.mechanic && trend.howTo);
}

export function selectTopTrends(trends, limit = 3) {
  const count = Number.isInteger(limit) && limit > 0 ? limit : 3;
  return [...(Array.isArray(trends) ? trends : [])]
    .sort((left, right) => (
      (PRIORITY_ORDER[left?.priority] ?? Number.MAX_SAFE_INTEGER) - (PRIORITY_ORDER[right?.priority] ?? Number.MAX_SAFE_INTEGER)
      || (STATUS_ORDER[left?.status] ?? Number.MAX_SAFE_INTEGER) - (STATUS_ORDER[right?.status] ?? Number.MAX_SAFE_INTEGER)
    ))
    .slice(0, count);
}

export function filterTrends(trends, filters = {}) {
  const query = String(filters.query || '').trim().toLocaleLowerCase('pt-BR');
  return (Array.isArray(trends) ? trends : []).filter((trend) => {
    const searchable = `${trend.title} ${trend.summary} ${trend.mechanic} ${trend.howTo}`.toLocaleLowerCase('pt-BR');
    return (!query || searchable.includes(query))
      && (!filters.category || trend.category === filters.category)
      && (!filters.profession || trend.profession === filters.profession)
      && (!filters.format || trend.format === filters.format)
      && (!filters.status || trend.status === filters.status)
      && (!filters.savedOnly || filters.savedIds?.has(trend.id))
      && (!filters.likedOnly || filters.likedIds?.has(trend.id));
  });
}

// `tendenciaParaEntrada` morava aqui: era a ponte que levava uma tendência
// desta tela para o carrossel. A etapa "Ideia" passou a pesquisar o assunto por
// conta própria, com acontecimento datado em vez de padrão editorial — quem faz
// a ponte agora é `assuntoParaEntrada`, em lib/carrossel-assuntos.js.

export function buildTrendCarouselPrompt(trend, brandName = '') {
  return [
    `Tema: ${text(trend?.carouselTheme || trend?.title, 140)}`,
    brandName && `Marca: ${text(brandName, 80)}`,
    `Mecânica: ${text(trend?.mechanic, 220)}`,
    `Como executar: ${text(trend?.howTo, 260)}`,
    text(trend?.carouselPrompt, 360),
    'Crie um carrossel original em português do Brasil. Não invente métricas, fatos ou promessas.'
  ].filter(Boolean).join('\n');
}
