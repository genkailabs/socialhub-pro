// Cada canal declara suas proprias metricas. Isso evita comparar ou somar
// nomes parecidos que possuem significados diferentes entre as redes.
export const REPORT_CHANNELS = {
  overview: { id: 'overview', label: 'Visao geral' },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    metricAliases: {
      crescimento: ['seguidores', 'variacao de seguidores', 'crescimento'],
      engajamento: ['engajamento', 'taxa de engajamento'],
      conteudos: ['publicacoes', 'conteudos', 'curtidas'],
      alcance: ['alcance'],
      retencao: ['retencao'],
      formatos: ['formatos'],
      horarios: ['melhores horarios', 'horarios'],
      publico: ['publico']
    }
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    metricAliases: {
      visualizacoes: ['visualizacoes', 'views'],
      tempoExibicao: ['tempo de exibicao', 'tempo assistido'],
      retencao: ['retencao'],
      inscritos: ['inscritos', 'seguidores', 'variacao de seguidores'],
      videos: ['videos', 'conteudos'],
      trafego: ['origem do trafego', 'trafego'],
      horarios: ['melhores horarios', 'horarios']
    }
  }
};

export function normalizeReportChannel(value) {
  const channel = String(value || '').toLowerCase();
  return REPORT_CHANNELS[channel] ? channel : 'overview';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function reportSectionForMetric(channel, metric) {
  const adapter = REPORT_CHANNELS[normalizeReportChannel(channel)];
  const normalizedMetric = normalizeText(metric);
  if (!adapter?.metricAliases || !normalizedMetric) return null;

  return Object.entries(adapter.metricAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizedMetric.includes(normalizeText(alias)))
  )?.[0] || null;
}

export function reportHref(channel, metric) {
  const normalizedChannel = normalizeReportChannel(channel);
  const params = new URLSearchParams({ channel: normalizedChannel });
  if (metric) params.set('metric', metric);
  return `/metrics?${params.toString()}`;
}
