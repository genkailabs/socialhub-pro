// tests/unit/guided-options.test.js
import { describe, it, expect } from 'vitest';
import { GUIDED_STEPS, OBJECTIVES, FREQUENCIES, CLASSIFICATION_BADGES } from '@/components/onboarding/guided/guided-options';

describe('guided-options', () => {
  it('GUIDED_STEPS possui 7 etapas com títulos corretos', () => {
    expect(GUIDED_STEPS.length).toBe(7);
    expect(GUIDED_STEPS[0].title).toBe('Boas-vindas');
    expect(GUIDED_STEPS[6].title).toBe('Planejamento da Semana');
  });

  it('OBJECTIVES permite objetivos do PRD', () => {
    const values = OBJECTIVES.map((o) => o.value);
    expect(values).toContain('vender');
    expect(values).toContain('educar');
    expect(values).toContain('captar_leads');
    expect(values).toContain('fortalecer_marca');
  });

  it('FREQUENCIES contém 3x_semana, 5x_semana, diario e ia_decide', () => {
    const values = FREQUENCIES.map((f) => f.value);
    expect(values).toEqual(['3x_semana', '5x_semana', 'diario', 'ia_decide']);
  });

  it('CLASSIFICATION_BADGES tem rótulos para CONFIRMED, INFERRED, NOT_FOUND', () => {
    expect(CLASSIFICATION_BADGES.CONFIRMED.label).toBe('Confirmado');
    expect(CLASSIFICATION_BADGES.INFERRED.label).toBe('Sugerido pela IA');
    expect(CLASSIFICATION_BADGES.NOT_FOUND.label).toBe('Não encontrado');
  });
});
