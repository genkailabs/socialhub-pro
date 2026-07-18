import { describe, expect, it } from 'vitest';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { normalizeSpec } from '@/lib/ai/spec';

describe('Composer AI v2', () => {
  it('normaliza CTA e cria uma chamada segura quando a IA nao envia uma', () => {
    expect(normalizeSpec({ cta: '  Salve este post para consultar depois.  ' }).cta)
      .toBe('Salve este post para consultar depois.');
    expect(normalizeSpec({}).cta).toBe('Salve este post para consultar depois.');
  });

  it('inclui contexto operacional local sem URLs ou dados de contato', () => {
    const { user } = buildContentPrompt({
      brief: { topic: 'Organizacao da semana', format: 'Carrossel' },
      composerContext: {
        weeklyMemory: 'Nesta semana, voce publicou 2 carrosseis.',
        hasMetricSignal: true,
        recommendedSlots: [{ label: 'Quarta, 18:00' }],
        opportunities: [
          { id: 'plan-1', label: 'Seguir o plano editorial', topic: 'Calendario de julho' },
          { id: 'strategy-objective', label: 'Avancar o objetivo: atrair pacientes', topic: 'Atrair pacientes' },
          { label: 'Contato 11999999999 https://exemplo.com', topic: 'nao usar' }
        ]
      }
    });

    expect(user).toContain('Contexto operacional do Composer');
    expect(user).toContain('Nesta semana, voce publicou 2 carrosseis.');
    expect(user).toContain('Quarta, 18:00');
    expect(user).toContain('Seguir o plano editorial');
    expect(user).not.toContain('https://exemplo.com');
    expect(user).not.toContain('11999999999');
  });
});
