// "há 14 min", "há 3 h", "ontem". Puro, sem I/O e com o agora injetável — é o
// que torna o teste possível sem congelar o relógio do processo.
//
// Por que não Intl.RelativeTimeFormat: ele devolve "há 90 minutos" onde a lista
// de produção quer "há 1 h". A régua aqui é a leitura de relance, não a
// precisão.
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relativeFromNow(value, now = new Date()) {
  if (!value) return '';
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const diff = now.getTime() - then.getTime();
  if (diff < 0) return 'em instantes';
  if (diff < MIN) return 'agora';
  if (diff < HOUR) return `há ${Math.floor(diff / MIN)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  if (diff < 2 * DAY) return 'ontem';
  if (diff < 7 * DAY) return `há ${Math.floor(diff / DAY)} dias`;

  return then.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** "Hoje, 20:30" · "ter, 09:00" — para o que ainda vai acontecer. */
export function scheduleLabel(value, now = new Date()) {
  if (!value) return 'Sem data';
  const when = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(when.getTime())) return 'Sem data';

  const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
  const sameDay = when.toDateString() === now.toDateString();
  if (sameDay) return `Hoje, ${time}`;

  const tomorrow = new Date(now.getTime() + DAY);
  if (when.toDateString() === tomorrow.toDateString()) return `Amanhã, ${time}`;

  return `${when.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${time}`;
}
