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

export function suggestedTimeForDate(date, slots = FALLBACK_PLANNING_SLOTS, index = 0) {
  const usable = slots.length ? slots : FALLBACK_PLANNING_SLOTS;
  const weekday = weekdayOfDate(date);
  const sameDay = usable.find((slot) => slot.weekday === weekday);
  return normalizeSuggestedTime(sameDay?.time || usable[index % usable.length]?.time) || '09:00';
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
