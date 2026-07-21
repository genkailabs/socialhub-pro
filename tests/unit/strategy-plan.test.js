import { describe, expect, it } from 'vitest';
import {
  weekStartOf, nextWeekStart, monthPeriod, activeStrategy,
  approvedItems, planProgress, itemWithinWeek, describeSignals,
  remainingPlanSlots
} from '@/lib/strategy-plan';

describe('describeSignals', () => {
  it('sem sinais nao inventa contexto', () => {
    expect(describeSignals(null)).toEqual([]);
  });

  // Dois cliques nao sao um padrao: melhor silencio que conclusao apressada.
  it('poucos sinais nao viram conclusao', () => {
    expect(describeSignals({ approve: 2, reject: 0, edit: 0 })).toEqual([]);
  });

  it('aprovacao alta vira contexto com o numero', () => {
    const frases = describeSignals({ approve: 8, reject: 1, edit: 1 });

    expect(frases.join(' ')).toContain('80%');
    expect(frases.join(' ')).toContain('aprovar');
  });

  it('muita edicao pede tom mais proximo', () => {
    expect(describeSignals({ approve: 3, reject: 0, edit: 7 }).join(' ')).toContain('edita');
  });

  it('muita rejeicao pede mudar a abordagem', () => {
    expect(describeSignals({ approve: 2, reject: 8, edit: 0 }).join(' ')).toContain('mude a abordagem');
  });
});

describe('weekStartOf', () => {
  it('quinta-feira volta para a segunda da mesma semana', () => {
    expect(weekStartOf(new Date('2026-07-16T12:00:00Z'))).toBe('2026-07-13');
  });

  it('segunda-feira e a propria segunda', () => {
    expect(weekStartOf(new Date('2026-07-13T00:00:00Z'))).toBe('2026-07-13');
  });

  // Domingo pertence a semana que comecou na segunda anterior, nao a seguinte.
  it('domingo fecha a semana anterior', () => {
    expect(weekStartOf(new Date('2026-07-19T23:00:00Z'))).toBe('2026-07-13');
  });
});

describe('nextWeekStart', () => {
  it('devolve a segunda seguinte', () => {
    expect(nextWeekStart(new Date('2026-07-16T12:00:00Z'))).toBe('2026-07-20');
  });

  it('atravessa a virada de mes', () => {
    expect(nextWeekStart(new Date('2026-07-30T12:00:00Z'))).toBe('2026-08-03');
  });
});

describe('monthPeriod', () => {
  it('cobre o mes inteiro', () => {
    expect(monthPeriod(new Date('2026-07-16T12:00:00Z'))).toEqual({ periodStart: '2026-07-01', periodEnd: '2026-07-31' });
  });

  it('acerta fevereiro bissexto', () => {
    expect(monthPeriod(new Date('2028-02-10T12:00:00Z'))).toEqual({ periodStart: '2028-02-01', periodEnd: '2028-02-29' });
  });
});

describe('activeStrategy', () => {
  it('devolve a aprovada', () => {
    expect(activeStrategy([{ id: 'a', status: 'archived' }, { id: 'b', status: 'approved' }]).id).toBe('b');
  });

  // Igual ao Brand DNA: proposta nao vale ate alguem aprovar.
  it('proposta nao vale como ativa', () => {
    expect(activeStrategy([{ id: 'c', status: 'proposed' }])).toBeNull();
  });
});

describe('approvedItems', () => {
  it('so tema aprovado segue para producao (RF-07)', () => {
    const items = [{ id: 1, status: 'approved' }, { id: 2, status: 'idea' }, { id: 3, status: 'rejected' }];

    expect(approvedItems(items).map((i) => i.id)).toEqual([1]);
  });
});

describe('planProgress', () => {
  it('conta os cinco estados do novo fluxo', () => {
    const items = [
      { status: 'idea' }, { status: 'idea' }, { status: 'approved' },
      { status: 'in_production' }, { status: 'ready' }, { status: 'rejected' }
    ];

    expect(planProgress(items)).toEqual({
      total: 6, idea: 2, approved: 1, inProduction: 1,
      ready: 1, rejected: 1, readyToProduce: true
    });
  });

  it('plano so com sugestoes ainda nao pode produzir', () => {
    expect(planProgress([{ status: 'idea' }]).readyToProduce).toBe(false);
  });

  it('aguenta plano vazio', () => {
    expect(planProgress([])).toMatchObject({ total: 0, readyToProduce: false });
  });
});

describe('itemWithinWeek', () => {
  it('aceita os sete dias da semana do plano', () => {
    expect(itemWithinWeek('2026-07-20', '2026-07-20')).toBe(true);
    expect(itemWithinWeek('2026-07-26', '2026-07-20')).toBe(true);
  });

  // A IA as vezes inventa data fora da semana; o banco aceitaria e o calendario
  // do usuario ficaria errado.
  it('recusa data fora da semana', () => {
    expect(itemWithinWeek('2026-07-27', '2026-07-20')).toBe(false);
    expect(itemWithinWeek('2026-07-19', '2026-07-20')).toBe(false);
  });

  it('recusa data invalida', () => {
    expect(itemWithinWeek('qualquer', '2026-07-20')).toBe(false);
  });
});

// RF-01/RF-02: vaga só é ocupada por item decidido (aprovado/em producao/pronto).
// Removidos (rejected) e ideias pendentes não contam, senão o usuário remove
// itens e o sistema deixa de sugerir substitutos.
describe('remainingPlanSlots', () => {
  it('todos aprovados: nenhuma vaga restante', () => {
    const items = [{ status: 'approved' }, { status: 'approved' }, { status: 'approved' }];
    expect(remainingPlanSlots(3, items)).toBe(0);
  });

  it('todos rejeitados: todas as vagas ficam livres', () => {
    const items = [{ status: 'rejected' }, { status: 'rejected' }, { status: 'rejected' }];
    expect(remainingPlanSlots(3, items)).toBe(3);
  });

  it('mistura de aprovados/rejeitados/ideias: só os decididos ocupam vaga', () => {
    const items = [
      { status: 'approved' }, { status: 'ready' }, { status: 'in_production' },
      { status: 'rejected' }, { status: 'idea' }
    ];
    expect(remainingPlanSlots(5, items)).toBe(2);
  });

  it('nunca devolve negativo quando há mais decididos que vagas', () => {
    const items = [{ status: 'approved' }, { status: 'approved' }, { status: 'ready' }];
    expect(remainingPlanSlots(2, items)).toBe(0);
  });

  it('lista vazia devolve todas as vagas', () => {
    expect(remainingPlanSlots(3, [])).toBe(3);
    expect(remainingPlanSlots(3, null)).toBe(3);
  });
});
