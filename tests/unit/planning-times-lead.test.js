import { describe, expect, it } from 'vitest';
import {
  earliestTimeFor, isDatePlannable, suggestedTimeForDate, resolveSuggestedTime,
  scheduleIsoFromPlanning, planTimeAfterEdit, planTimeHasPassed, todayInSaoPaulo,
  FALLBACK_PLANNING_SLOTS, MIN_LEAD_MINUTES
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

// A escolha do usuario e diferente do palpite da IA: ela so e trocada quando nao
// cabe, e a troca precisa vir com motivo para a tela poder avisar.
describe('planTimeAfterEdit', () => {
  it('mantem o horario escolhido a mao quando ele ainda cabe', () => {
    expect(planTimeAfterEdit({ date: HOJE, time: '20:00', now: TERCA_1631 }))
      .toEqual({ time: '20:00', adjusted: false, reason: null });
  });

  it('mantem horario de madrugada em data futura — escolha do usuario manda', () => {
    expect(planTimeAfterEdit({ date: AMANHA, time: '05:30', now: TERCA_1631 }))
      .toEqual({ time: '05:30', adjusted: false, reason: null });
  });

  it('ajusta e explica quando o horario esta perto demais de agora', () => {
    const resultado = planTimeAfterEdit({ date: HOJE, time: '16:45', now: TERCA_1631 });
    expect(resultado.adjusted).toBe(true);
    expect(resultado.reason).toBe('too-soon');
    expect(resultado.time >= '18:00').toBe(true);
  });

  it('recalcula o melhor horario a partir de hoje quando a data muda', () => {
    const resultado = planTimeAfterEdit({ date: AMANHA, time: '20:00', recalculate: true, now: TERCA_1631 });
    expect(resultado).toEqual({ time: '18:00', adjusted: true, reason: 'date-changed' });
  });

  it('preenche o horario quando o campo veio vazio', () => {
    const resultado = planTimeAfterEdit({ date: AMANHA, time: '', now: TERCA_1631 });
    expect(resultado.adjusted).toBe(true);
    expect(resultado.reason).toBe('invalid');
    expect(resultado.time).toBe('18:00');
  });

  it('avisa quando o dia nao comporta mais nada', () => {
    const quase = new Date('2026-07-22T02:40:00.000Z');
    expect(planTimeAfterEdit({ date: HOJE, time: '23:59', now: quase }))
      .toEqual({ time: null, adjusted: true, reason: 'day-full' });
  });
});

describe('planTimeHasPassed', () => {
  it('marca horario de hoje que ja passou', () => {
    expect(planTimeHasPassed(HOJE, '12:00', TERCA_1631)).toBe(true);
  });

  it('nao marca horario de hoje ainda por vir', () => {
    expect(planTimeHasPassed(HOJE, '20:00', TERCA_1631)).toBe(false);
  });

  it('nao marca data futura', () => {
    expect(planTimeHasPassed(AMANHA, '06:00', TERCA_1631)).toBe(false);
  });

  it('marca data que ja passou', () => {
    expect(planTimeHasPassed('2026-07-20', '23:00', TERCA_1631)).toBe(true);
  });

  it('sem horario valido nao ha o que marcar', () => {
    expect(planTimeHasPassed(HOJE, null, TERCA_1631)).toBe(false);
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
