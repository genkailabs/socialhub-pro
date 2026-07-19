// Regras puras da estratégia e do plano editorial (PRD Etapas 8 e 9). Sem I/O.

const DIA_MS = 24 * 3600 * 1000;
const iso = (d) => d.toISOString().slice(0, 10);

// Segunda-feira da semana de `now`. Semana do plano começa na segunda porque é
// como a pessoa pensa a própria semana de trabalho.
export function weekStartOf(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diaSemana = d.getUTCDay(); // 0 = domingo
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  return iso(new Date(d.getTime() - recuo * DIA_MS));
}

export function nextWeekStart(now = new Date()) {
  return iso(new Date(new Date(`${weekStartOf(now)}T00:00:00.000Z`).getTime() + 7 * DIA_MS));
}

// Ciclo mensal é o padrão do MVP (§8-E8).
export function monthPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { periodStart: iso(start), periodEnd: iso(end) };
}

export function activeStrategy(strategies = []) {
  return strategies.find((s) => s.status === 'approved') || null;
}

// Só tema aprovado vira conteúdo (RF-07).
export function approvedItems(items = []) {
  return items.filter((i) => i.status === 'approved');
}

export function planProgress(items = []) {
  const total = items.length;
  const conta = (s) => items.filter((i) => i.status === s).length;
  return {
    total,
    idea: conta('idea'),
    approved: conta('approved'),
    inProduction: conta('in_production'),
    ready: conta('ready'),
    rejected: conta('rejected'),
    // Pronto para produzir = existe tema aprovado ainda não produzido.
    readyToProduce: conta('approved') > 0
  };
}

// Item fora da semana do plano indica IA inventando data — o banco aceitaria,
// mas o calendário do usuário ficaria errado.
export function itemWithinWeek(date, weekStart) {
  const inicio = new Date(`${weekStart}T00:00:00.000Z`).getTime();
  const d = new Date(`${date}T00:00:00.000Z`).getTime();
  if (Number.isNaN(d) || Number.isNaN(inicio)) return false;
  const delta = d - inicio;
  return delta >= 0 && delta < 7 * DIA_MS;
}

// Traduz as contagens de dna_signals em frases curtas para o prompt (§8-E16).
// São CONTEXTO, não regra: a IA considera, o usuário continua decidindo.
// Poucos sinais não dizem nada — melhor silêncio do que conclusão de 2 cliques.
export const MIN_SIGNALS = 5;

export function describeSignals(counts) {
  if (!counts) return [];
  const { approve = 0, reject = 0, edit = 0 } = counts;
  const total = approve + reject + edit;
  if (total < MIN_SIGNALS) return [];

  const pct = (n) => Math.round((n / total) * 100);
  const frases = [];

  if (pct(approve) >= 60) frases.push(`O usuario costuma aprovar as sugestoes (${pct(approve)}% das ${total} ultimas).`);
  if (pct(edit) >= 30) frases.push(`O usuario edita boa parte do que recebe (${pct(edit)}%): entregue algo mais proximo do tom dele.`);
  if (pct(reject) >= 30) frases.push(`O usuario rejeita boa parte das sugestoes (${pct(reject)}%): mude a abordagem.`);

  return frases;
}

export const ITEM_STATUS = {
  idea: { label: 'Ideia', tone: 'muted' },
  approved: { label: 'Aprovado', tone: 'success' },
  in_production: { label: 'Em producao', tone: 'accent' },
  ready: { label: 'Pronto para publicar', tone: 'success' },
  rejected: { label: 'Removido', tone: 'danger' }
};
