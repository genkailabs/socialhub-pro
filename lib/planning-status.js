// A migração atualiza os registros persistidos, mas esta normalização também
// protege a tela durante a transição e em bases onde ainda exista algum item
// legado retornado por cache.
const LEGACY_ITEM_STATUSES = {
  proposed: 'idea',
  produced: 'ready'
};

export function normalizePlanningItemStatus(status) {
  return LEGACY_ITEM_STATUSES[status] || status;
}

// MVP V2 §20: a tela deixa de ser "Ideias / Em produção / Prontos" e passa a
// mostrar o caminho inteiro do conteúdo, até publicar.
export const PLANNING_COLUMNS = [
  { key: 'ideas', title: 'Ideias', hint: 'Ainda não aprovadas' },
  { key: 'approved', title: 'Aprovados', hint: 'Prontos para geração' },
  { key: 'creating', title: 'Conteúdo em criação', hint: 'Sendo produzidos' },
  { key: 'scheduled', title: 'Agendados', hint: 'Prontos para publicação' },
  { key: 'published', title: 'Publicados', hint: 'Já publicados' }
];

// As duas últimas colunas dependem do POST, não do item: um item "ready" só
// vira "Publicados" quando o post realmente saiu. O sistema não pode afirmar
// ter publicado o que não publicou.
export function columnForPlanningItem(item) {
  if (!item) return null;
  const status = normalizePlanningItemStatus(item.status);
  if (status === 'rejected') return null;
  if (item.post_status === 'published') return 'published';
  // `ready_to_post` é o estado de quem posta manualmente (stories, e reels
  // legados): está pronto para publicação, mesmo sem agendamento automático.
  if (status === 'ready') return 'scheduled';
  if (status === 'in_production') return 'creating';
  if (status === 'approved') return 'approved';
  if (status === 'idea') return 'ideas';
  return null;
}

export function groupPlanningItemsByColumn(items = []) {
  const grupos = Object.fromEntries(PLANNING_COLUMNS.map((c) => [c.key, []]));
  for (const item of items) {
    const coluna = columnForPlanningItem(item);
    if (coluna && grupos[coluna]) grupos[coluna].push(item);
  }
  return grupos;
}
