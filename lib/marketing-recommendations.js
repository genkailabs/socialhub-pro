const FORMAT_MAP = {
  IMAGE: 'image',
  SINGLE_IMAGE: 'image',
  CAROUSEL: 'carousel',
  CAROUSEL_ALBUM: 'carousel',
  REEL: 'reel',
  REELS: 'reel',
  VIDEO: 'reel',
  STORIES: 'stories'
};

function text(value, fallback = '') {
  return String(value || '').trim() || fallback;
}

function firstPillar(strategy) {
  const pillars = strategy?.pillars;
  if (!Array.isArray(pillars) || !pillars.length) return 'conteúdo educativo';
  const pillar = pillars[0];
  return text(typeof pillar === 'string' ? pillar : pillar?.name || pillar?.title, 'conteúdo educativo');
}

function mainObjective(strategy) {
  const objectives = strategy?.objectives;
  if (typeof objectives === 'string') return text(objectives, 'fortalecer a presença da marca');
  if (Array.isArray(objectives)) return text(objectives[0], 'fortalecer a presença da marca');
  return text(objectives?.main || objectives?.primary, 'fortalecer a presença da marca');
}

function formatFor(value) {
  return FORMAT_MAP[text(value).replace(/[ -]/g, '_').toUpperCase()] || 'carousel';
}

function evidence(metric, currentValue, previousValue, period, source = 'Instagram') {
  const variation = Number.isFinite(previousValue) && previousValue !== 0
    ? Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 1000) / 10
    : undefined;
  return { metric, currentValue, ...(Number.isFinite(previousValue) ? { previousValue } : {}), ...(Number.isFinite(variation) ? { variation } : {}), period, source };
}

function candidate({ score, sourceType, title, finding, meaning, recommendation, contentPlan, evidence: items, confidence }) {
  return { score, sourceType, title, finding, meaning, recommendation, contentPlan, evidence: items, confidence };
}

// Regras puras: recebem somente números e contexto já coletados. Assim o motor
// nunca transforma uma ausência de métrica em uma conclusão sobre desempenho.
export function rankRecommendationOpportunities({ audit = null, strategy = null, planItems = [], learningSignals = [], hasApprovedDna = false } = {}) {
  const metrics = audit?.calculated_metrics || audit?.metrics || {};
  const frequency = metrics.frequency || {};
  const growth = metrics.growth;
  const rankedPosts = metrics.posts || {};
  const lowData = metrics.lowData === true || !audit;
  const pillar = firstPillar(strategy);
  const objective = mainObjective(strategy);
  const candidates = [];

  const successfulLearning = learningSignals.find((signal) => Number(signal.comparison_percent) > 0 && signal.format);
  if (successfulLearning) {
    const gain = Math.round(Number(successfulLearning.comparison_percent));
    candidates.push(candidate({
      score: 75 + Math.min(gain, 20), sourceType: 'performance_opportunity',
      title: 'Um formato recomendado funcionou bem',
      finding: `Um ${successfulLearning.format} recente ficou ${gain}% acima da média anterior em ${text(successfulLearning.metric_name, 'desempenho')}.`,
      meaning: 'Esse resultado sugere que vale repetir o aprendizado com um novo tema, sem prometer o mesmo resultado.',
      recommendation: `Criar outro ${successfulLearning.format} no pilar “${text(successfulLearning.pillar, pillar)}”, com uma nova abordagem sobre ${text(successfulLearning.topic, pillar)}.`,
      contentPlan: { format: formatFor(successfulLearning.format), pillar: text(successfulLearning.pillar, pillar), topic: `Novo ângulo sobre ${text(successfulLearning.topic, pillar)}`, objective },
      evidence: [evidence(text(successfulLearning.metric_name, 'Desempenho'), Number(successfulLearning.observed_value), Number(successfulLearning.baseline_value), 'conteúdos publicados anteriormente', 'Aprendizado do Assistente')],
      confidence: 'medium'
    }));
  }

  if (!lowData && Number.isFinite(growth?.delta) && growth.delta < 0) {
    candidates.push(candidate({
      score: 100 + Math.min(Math.abs(growth.delta), 30),
      sourceType: 'performance_drop',
      title: 'Crescimento de seguidores em queda',
      finding: `O perfil perdeu ${Math.abs(growth.delta)} seguidor${Math.abs(growth.delta) === 1 ? '' : 'es'} no período analisado.`,
      meaning: 'Isso pode indicar que a presença atual não está alcançando pessoas novas com a mesma força.',
      recommendation: `Criar um carrossel educativo dentro do pilar “${pillar}”, com uma ideia principal clara já na primeira página.`,
      contentPlan: { format: 'carousel', pillar, topic: `Uma dúvida importante sobre ${pillar}`, objective },
      evidence: [evidence('Variação de seguidores', growth.end, growth.start, 'período do diagnóstico')],
      confidence: 'medium'
    }));
  }

  if (!lowData && Number.isFinite(frequency.perWeek) && frequency.perWeek < 1) {
    candidates.push(candidate({
      score: 80 + Math.round((1 - frequency.perWeek) * 10),
      sourceType: 'consistency',
      title: 'Frequência de publicação baixa',
      finding: `Foram identificados ${frequency.total || 0} conteúdos no histórico analisado, cerca de ${frequency.perWeek} por semana.`,
      meaning: 'Com pouca regularidade, fica mais difícil manter a marca presente para o público.',
      recommendation: `Criar um carrossel educativo simples sobre “${pillar}” para retomar uma cadência consistente.`,
      contentPlan: { format: 'carousel', pillar, topic: `Guia prático sobre ${pillar}`, objective },
      evidence: [evidence('Frequência de publicação', frequency.perWeek, undefined, 'histórico do diagnóstico')],
      confidence: 'medium'
    }));
  }

  if (!lowData && rankedPosts?.top?.[0] && Number.isFinite(rankedPosts.average)) {
    const top = rankedPosts.top[0];
    const format = formatFor(top.format);
    candidates.push(candidate({
      score: 65 + Math.min(Math.round((top.interactions / Math.max(rankedPosts.average, 1)) * 10), 20),
      sourceType: 'performance_opportunity',
      title: 'Oportunidade de repetir um formato que funcionou',
      finding: `Um ${text(top.format, 'conteúdo')} recente teve ${top.interactions} interações, acima da média de ${rankedPosts.average}.`,
      meaning: 'Esse resultado sugere que vale testar novamente esse formato com um novo tema estratégico.',
      recommendation: `Criar um novo conteúdo em formato ${text(top.format, 'carrossel')}, abordando “${pillar}”.`,
      contentPlan: { format, pillar, topic: `Novo ângulo sobre ${pillar}`, objective },
      evidence: [evidence('Interações do conteúdo de melhor desempenho', top.interactions, rankedPosts.average, 'histórico do diagnóstico')],
      confidence: 'medium'
    }));
  }

  const planned = planItems.find((item) => item?.topic || item?.title);
  if (planned) {
    candidates.push(candidate({
      score: 60,
      sourceType: 'content_gap',
      title: 'Tema estratégico aguardando conteúdo',
      finding: `O plano editorial aprovado já prevê o tema “${text(planned.topic || planned.title)}”.`,
      meaning: 'Transformar esse tema em conteúdo mantém a comunicação alinhada à estratégia aprovada.',
      recommendation: `Criar o conteúdo planejado sobre “${text(planned.topic || planned.title)}”.`,
      contentPlan: { format: formatFor(planned.format), pillar: text(planned.pillar, pillar), topic: text(planned.topic || planned.title), objective: text(planned.objective, objective) },
      evidence: [{ metric: 'Tema aprovado no plano editorial', currentValue: 1, period: 'semana atual', source: 'Plano editorial' }],
      confidence: 'high'
    }));
  }

  // Este caminho é deliberadamente explícito: Brand DNA e estratégia orientam a
  // ação, mas não são apresentados como se fossem uma métrica de desempenho.
  candidates.push(candidate({
    score: hasApprovedDna ? 30 : 10,
    sourceType: hasApprovedDna ? 'brand_strategy' : 'evergreen',
    title: lowData ? 'Ainda estamos aprendendo com seu perfil' : 'Manter uma presença estratégica',
    finding: lowData
      ? 'Ainda não há histórico suficiente de métricas para concluir o que está funcionando melhor.'
      : `A estratégia aprovada prioriza “${pillar}”.`,
    meaning: lowData
      ? 'Enquanto reunimos mais dados, a decisão usa apenas o contexto aprovado da sua marca.'
      : 'Um conteúdo consistente neste pilar ajuda a manter a comunicação alinhada ao objetivo da marca.',
    recommendation: `Criar um carrossel educativo sobre “${pillar}”, com uma resposta clara para uma dúvida do público.`,
    contentPlan: { format: 'carousel', pillar, topic: `Dúvida frequente sobre ${pillar}`, objective },
    evidence: [{ metric: lowData ? 'Histórico suficiente de métricas' : 'Pilar estratégico aprovado', currentValue: lowData ? 0 : 1, period: lowData ? 'coleta atual' : 'estratégia vigente', source: lowData ? 'Instagram' : 'Estratégia aprovada' }],
    confidence: lowData ? 'low' : 'medium'
  }));

  return candidates.sort((a, b) => b.score - a.score);
}

export function selectSingleRecommendation(input = {}) {
  const selected = rankRecommendationOpportunities(input)[0];
  return { ...selected, status: 'ready', channel: 'instagram' };
}
