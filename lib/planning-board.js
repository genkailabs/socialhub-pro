import { PLANNING_COLUMNS, columnForPlanningItem } from '@/lib/planning-status';

// O quadro mostra as cinco etapas do conteúdo, mas o usuário só manda em duas
// fronteiras: aprovar (ou desaprovar) uma ideia e mandar produzir o que já foi
// aprovado. "Agendados" e "Publicados" são consequência do post — o sistema não
// pode dizer que publicou algo só porque um card foi solto numa coluna.
export function planningDropAction(item, columnKey) {
  const from = columnForPlanningItem(item);
  if (!from || from === columnKey) return null;

  const titulo = item.title || item.topic || 'este tema';

  if (from === 'ideas' && columnKey === 'approved') {
    return { kind: 'approve', status: 'approved', label: 'Aprovar' };
  }
  if (from === 'approved' && columnKey === 'ideas') {
    return { kind: 'unapprove', status: 'idea', label: 'Voltar para ideias' };
  }
  // Produzir gasta crédito de IA (RF-04). Arrastar é rápido demais para gastar
  // sem perguntar, então esta é a única transição do quadro que confirma antes.
  if (from === 'approved' && columnKey === 'creating') {
    return { kind: 'produce', cost: 1, label: 'Gerar conteúdo', confirm: `Gerar conteúdo com IA para "${titulo}"? Usa 1 crédito.` };
  }

  return null;
}

export function planningDropTargets(item) {
  return PLANNING_COLUMNS.filter((column) => planningDropAction(item, column.key)).map((column) => column.key);
}

// Aparência de cada coluna durante o arrasto: 'idle' quando nada está sendo
// arrastado, 'source' na coluna de origem, 'target' onde soltar faz algo e
// 'blocked' onde soltar não significa nada.
export function planningColumnDragState(columnKey, draggingItem) {
  if (!draggingItem) return 'idle';
  if (columnForPlanningItem(draggingItem) === columnKey) return 'source';
  return planningDropAction(draggingItem, columnKey) ? 'target' : 'blocked';
}
