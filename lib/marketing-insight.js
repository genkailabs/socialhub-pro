export function formatInsightValue(value, metric = '') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';

  const normalizedMetric = String(metric).toLowerCase();
  if (normalizedMetric.includes('frequ')) return `${formatNumber(number)} por semana`;
  if (normalizedMetric.includes('taxa') || normalizedMetric.includes('reten') || normalizedMetric.includes('percentual')) return `${formatNumber(number)}%`;
  return formatNumber(number);
}

export function formatVariation(variation) {
  const number = Number(variation);
  if (!Number.isFinite(number)) return null;
  return `${number > 0 ? '+' : ''}${formatNumber(number)}%`;
}

function formatNumber(value) {
  return String(Math.round(value * 10) / 10).replace('.', ',');
}

export function chartDataForEvidence(evidence) {
  if (!evidence || !Number.isFinite(Number(evidence.currentValue)) || !Number.isFinite(Number(evidence.previousValue))) return [];
  return [
    { label: 'Período anterior', value: Number(evidence.previousValue) },
    { label: 'Período atual', value: Number(evidence.currentValue) }
  ];
}

export function detailsHrefForRecommendation(recommendation) {
  const metric = recommendation?.evidence?.[0]?.metric || 'visao-geral';
  const channel = recommendation?.channel || 'overview';
  // Mantem a origem no link: o relatorio escolhe a secao apenas dentro
  // daquele canal, sem tentar reutilizar metricas entre redes.
  return `/metrics?channel=${encodeURIComponent(channel)}&metric=${encodeURIComponent(metric)}`;
}
