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
