// Rótulos e períodos do histórico de custos (RF-12/RF-15). Puro, sem I/O — dá
// para usar no server (dados) e no client (barra de filtros) e testar isolado.

// Mapa estático de skill_id → ação em português. Sem IA: é só tradução.
export const ACTION_LABELS = {
  'editorial-planner': 'Planejamento semanal',
  'post-producer': 'Produção de post',
  'reel-producer': 'Produção de reel',
  'story-planner': 'Planejamento de story',
  'content-strategy': 'Estratégia de conteúdo',
  'instagram-audit': 'Diagnóstico do Instagram',
  'brand-context': 'Contexto da marca',
  'content-review': 'Revisão de conteúdo'
};

// Fallback por `kind` quando não há skill_id (jobs antigos ou não-skill).
const KIND_LABELS = {
  post: 'Produção de post',
  image: 'Geração de imagem',
  research: 'Pesquisa de contexto',
  brand_dna: 'Brand DNA',
  autopilot: 'Piloto automático'
};

export function actionLabel({ skill_id, kind } = {}) {
  if (skill_id && ACTION_LABELS[skill_id]) return ACTION_LABELS[skill_id];
  if (kind && KIND_LABELS[kind]) return KIND_LABELS[kind];
  return skill_id || kind || '—';
}

// Opções de ação para o filtro (todas as skills conhecidas).
export const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }));

export const COST_PERIODS = [
  { value: 'all', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Este mês' }
];

// Início do período para o filtro de data. `all`/desconhecido → null (sem corte).
export function costPeriodStart(period, now = new Date()) {
  const d = new Date(now);
  if (period === '7d') { d.setUTCDate(d.getUTCDate() - 7); return d.toISOString(); }
  if (period === '30d') { d.setUTCDate(d.getUTCDate() - 30); return d.toISOString(); }
  if (period === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  return null;
}
