import { describe, expect, it } from 'vitest';
import {
  earliestTimeFor, isDatePlannable, suggestedTimeForDate, resolveSuggestedTime,
  scheduleIsoFromPlanning, todayInSaoPaulo, FALLBACK_PLANNING_SLOTS, MIN_LEAD_MINUTES
} from '@/lib/planning-times';

// O caso real reportado: terca-feira, 16:31 em Sao Paulo. Nenhum slot padrao
// cai na terca, entao o codigo antigo caia no primeiro da lista (segunda 12:00)
// e gravava um horario que ja tinha passado.
const TERCA_1631 = new Date('2026-07-21T19:31:00.000Z'); // 16:31 em SP
const HOJE = '2026-07-21';
const AMANHA = '2026-07-22';

describe('earliestTimeFor', () => {
  it('data futura aceita qualquer horario', () => {
    expect(earliestTimeFor(AMANHA, TERCA_1631)).toBe('00:00');
  });

  it('hoje exige antecedencia e arredonda para a meia hora', () => {
    // 16:31 + 60min = 17:31 -> arredonda para 18:00.
    expect(earliestTimeFor(HOJE, TERCA_1631)).toBe('18:00');
  });

  it('data passada nao e plannavel', () => {
    expect(earliestTimeFor('2026-07-20', TERCA_1631)).toBeNull();
    expect(isDatePlannable('2026-07-20', TERCA_1631)).toBe(false);
  });

  it('fim do dia deixa de comportar publicacao', () => {
    const quase = new Date('2026-07-22T02:40:00.000Z'); // 23:40 em SP do dia 21
    expect(todayInSaoPaulo(quase)).toBe(HOJE);
    expect(earliestTimeFor(HOJE, quase)).toBeNull();
    expect(isDatePlannable(HOJE, quase)).toBe(false);
  });

  it('a antecedencia minima e de uma hora', () => {
    expect(MIN_LEAD_MINUTES).toBe(60);
  });
});

describe('suggestedTimeForDate (§1: janela comeca hoje)', () => {
  it('NAO devolve mais 12:00 numa terca as 16:31 — o bug reportado', () => {
    const time = suggestedTimeForDate(HOJE, FALLBACK_PLANNING_SLOTS, 0, TERCA_1631);
    expect(time).not.toBe('12:00');
    expect(time >= '18:00').toBe(true);
  });

  it('usa o proximo slot do dia que ainda cabe', () => {
    // Quarta 18:00 esta na lista padrao e ainda cabe as 16:31.
    expect(suggestedTimeForDate(HOJE, FALLBACK_PLANNING_SLOTS, 0, TERCA_1631)).toBe('18:00');
  });

  it('mantem o horario preferido quando ele ainda esta por vir', () => {
    const manha = new Date('2026-07-21T12:00:00.000Z'); // 09:00 em SP
    expect(suggestedTimeForDate(HOJE, FALLBACK_PLANNING_SLOTS, 0, manha)).toBe('12:00');
  });

  it('em data futura respeita o slot do dia da semana', () => {
    // 22/07/2026 e quarta: slot 18:00.
    expect(suggestedTimeForDate(AMANHA, FALLBACK_PLANNING_SLOTS, 0, TERCA_1631)).toBe('18:00');
  });

  it('devolve null quando o dia acabou', () => {
    const quase = new Date('2026-07-22T02:40:00.000Z');
    expect(suggestedTimeForDate(HOJE, FALLBACK_PLANNING_SLOTS, 0, quase)).toBeNull();
  });
});

describe('resolveSuggestedTime', () => {
  it('respeita o horario da IA quando ele e viavel', () => {
    expect(resolveSuggestedTime({ date: HOJE, aiTime: '20:00', now: TERCA_1631 })).toBe('20:00');
  });

  // A IA nao sabe que horas sao: ela poderia sugerir 12:00 para hoje.
  it('corrige horario da IA que ja passou', () => {
    const time = resolveSuggestedTime({ date: HOJE, aiTime: '12:00', now: TERCA_1631 });
    expect(time).not.toBe('12:00');
    expect(time >= '18:00').toBe(true);
  });

  it('ignora horario invalido da IA', () => {
    expect(resolveSuggestedTime({ date: AMANHA, aiTime: 'meio-dia', now: TERCA_1631 })).toBe('18:00');
  });

  it('devolve null quando nao ha horario possivel', () => {
    const quase = new Date('2026-07-22T02:40:00.000Z');
    expect(resolveSuggestedTime({ date: HOJE, aiTime: '23:59', now: quase })).toBeNull();
  });
});

describe('scheduleIsoFromPlanning (§1: resolucao de horario na conversao ISO)', () => {
  it('nunca agenda no passado quando o item tem horario sugerido vencido', () => {
    // 12:00 em Sao Paulo no dia 2026-07-21 seria 2026-07-21T15:00:00.000Z.
    // Como a conversao e chamada as 16:31, resolve para 18:00 (2026-07-21T21:00:00.000Z).
    const iso = scheduleIsoFromPlanning(HOJE, '12:00', FALLBACK_PLANNING_SLOTS, 0, TERCA_1631);
    expect(iso).toBe('2026-07-21T21:00:00.000Z');
  });

  it('mantem a conversao exata para datas futuras ou horarios ainda por vir', () => {
    expect(scheduleIsoFromPlanning(AMANHA, '12:00', FALLBACK_PLANNING_SLOTS, 0, TERCA_1631)).toBe('2026-07-22T15:00:00.000Z');
  });
});
