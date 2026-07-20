import { describe, expect, it } from 'vitest';
import { actionLabel, costPeriodStart } from '@/lib/ai-costs-labels';

describe('actionLabel', () => {
  it('traduz skill_id conhecido', () => {
    expect(actionLabel({ skill_id: 'editorial-planner' })).toBe('Planejamento semanal');
    expect(actionLabel({ skill_id: 'post-producer' })).toBe('Produção de post');
  });

  it('cai no kind quando não há skill_id mapeado', () => {
    expect(actionLabel({ skill_id: null, kind: 'research' })).toBe('Pesquisa de contexto');
    expect(actionLabel({ kind: 'image' })).toBe('Geração de imagem');
  });

  it('mostra o valor cru quando nada é conhecido', () => {
    expect(actionLabel({ skill_id: 'algo-novo' })).toBe('algo-novo');
    expect(actionLabel({})).toBe('—');
  });
});

describe('costPeriodStart', () => {
  const now = new Date('2026-07-20T12:00:00Z');

  it('7d volta uma semana', () => {
    expect(costPeriodStart('7d', now)).toBe('2026-07-13T12:00:00.000Z');
  });

  it('mês começa no dia 1', () => {
    expect(costPeriodStart('month', now)).toBe('2026-07-01T00:00:00.000Z');
  });

  it('all não filtra (null)', () => {
    expect(costPeriodStart('all', now)).toBe(null);
    expect(costPeriodStart(null, now)).toBe(null);
  });
});
