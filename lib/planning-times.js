const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

export const FALLBACK_PLANNING_SLOTS = [
  { weekday: 1, time: '12:00', label: 'Segunda, 12:00', basis: 'initial' },
  { weekday: 3, time: '18:00', label: 'Quarta, 18:00', basis: 'initial' },
  { weekday: 5, time: '11:00', label: 'Sexta, 11:00', basis: 'initial' }
];

export function normalizeSuggestedTime(value) {
  const time = String(value || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function weekdayOfDate(date) {
  const d = new Date(`${date}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
}

// Antecedência mínima entre "agora" e o horário sugerido. Sugerir 16:45 às
// 16:31 seria tecnicamente futuro e praticamente inútil: ninguém aprova,
// produz e agenda em 14 minutos.
export const MIN_LEAD_MINUTES = 60;

const SP_OFFSET_HOURS = 3;
const pad = (n) => String(n).padStart(2, '0');

// Data de hoje no fuso de São Paulo — mesmo critério de planningWindowStart.
export function todayInSaoPaulo(now = new Date()) {
  const sp = new Date(now.getTime() - SP_OFFSET_HOURS * 3600 * 1000);
  return `${sp.getUTCFullYear()}-${pad(sp.getUTCMonth() + 1)}-${pad(sp.getUTCDate())}`;
}

function minutesNowInSaoPaulo(now = new Date()) {
  const sp = new Date(now.getTime() - SP_OFFSET_HOURS * 3600 * 1000);
  return sp.getUTCHours() * 60 + sp.getUTCMinutes();
}

const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
};

/**
 * Horário mínimo aceitável para uma data, em HH:MM.
 *
 * A janela de planejamento passou a começar HOJE (MVP V2 §1), então a data 0
 * pode ter horários que já passaram. Antes disso o plano começava na próxima
 * segunda e todo horário era futuro por construção — por isso esta regra não
 * existia.
 *
 * Devolve `null` quando não sobra horário útil no dia (o dia não é plannável).
 */
export function earliestTimeFor(date, now = new Date()) {
  const hoje = todayInSaoPaulo(now);
  const dia = String(date || '').slice(0, 10);
  if (!dia) return null;
  if (dia > hoje) return '00:00';
  if (dia < hoje) return null;

  // Hoje: agora + antecedência, arredondado para cima na meia hora.
  const alvo = minutesNowInSaoPaulo(now) + MIN_LEAD_MINUTES;
  const arredondado = Math.ceil(alvo / 30) * 30;
  if (arredondado >= 24 * 60) return null;
  return `${pad(Math.floor(arredondado / 60))}:${pad(arredondado % 60)}`;
}

// O dia ainda comporta uma publicação?
export function isDatePlannable(date, now = new Date()) {
  return earliestTimeFor(date, now) !== null;
}

function slotFromMetric(slot) {
  if (!Number.isInteger(slot?.weekday) || !Number.isInteger(slot?.hour)) return null;
  if (slot.weekday < 0 || slot.weekday > 6 || slot.hour < 0 || slot.hour > 23) return null;
  const time = `${String(slot.hour).padStart(2, '0')}:00`;
  return {
    weekday: slot.weekday,
    time,
    label: `${WEEKDAYS[slot.weekday]}, ${time}`,
    basis: slot.basis || 'measured'
  };
}

export function planningSlotsFromAudit(audit = null) {
  const metrics = audit?.calculated_metrics || audit?.metrics || {};
  const measured = (Array.isArray(metrics.bestTimes) ? metrics.bestTimes : [])
    .map(slotFromMetric)
    .filter((slot) => slot && slot.basis !== 'heuristic')
    .slice(0, 5);

  return {
    hasMetricSignal: measured.length > 0,
    slots: measured.length ? measured : FALLBACK_PLANNING_SLOTS
  };
}

export function suggestedTimeForDate(date, slots = FALLBACK_PLANNING_SLOTS, index = 0, now = new Date()) {
  const usable = slots.length ? slots : FALLBACK_PLANNING_SLOTS;
  const weekday = weekdayOfDate(date);
  const sameDay = usable.find((slot) => slot.weekday === weekday);
  const preferido = normalizeSuggestedTime(sameDay?.time || usable[index % usable.length]?.time) || '09:00';

  // Sugerir horário que já passou é o mesmo que não sugerir nada (§1: a janela
  // começa hoje, então o dia 0 precisa desta guarda).
  const piso = earliestTimeFor(date, now);
  if (piso === null) return null;
  if (toMinutes(preferido) >= toMinutes(piso)) return preferido;

  // O preferido já passou: usa o próximo horário do dia que ainda cabe.
  const proximo = usable
    .map((slot) => normalizeSuggestedTime(slot.time))
    .filter(Boolean)
    .sort()
    .find((time) => toMinutes(time) >= toMinutes(piso));
  return proximo || piso;
}

/**
 * Horário final de um item do plano: respeita o que a IA sugeriu, mas nunca
 * grava horário no passado. Devolve `null` quando o dia não comporta mais nada.
 */
export function resolveSuggestedTime({ date, aiTime, slots = FALLBACK_PLANNING_SLOTS, index = 0, now = new Date() } = {}) {
  const piso = earliestTimeFor(date, now);
  if (piso === null) return null;

  const daIa = normalizeSuggestedTime(aiTime);
  if (daIa && toMinutes(daIa) >= toMinutes(piso)) return daIa;
  return suggestedTimeForDate(date, slots, index, now);
}

export function scheduleIsoFromPlanning(date, time) {
  const suggested = normalizeSuggestedTime(time);
  if (!date || !suggested) return null;
  const [year, month, day] = String(date).split('-').map(Number);
  const [hour, minute] = suggested.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  // Horario de Sao Paulo (UTC-3) convertido para UTC.
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0)).toISOString();
}

export function planningSlotsLabel({ slots = FALLBACK_PLANNING_SLOTS, hasMetricSignal = false } = {}) {
  const source = hasMetricSignal ? 'medidos no diagnostico' : 'iniciais ate haver metricas confiaveis';
  return `${slots.map((slot) => slot.label).join('; ')} (${source})`;
}
