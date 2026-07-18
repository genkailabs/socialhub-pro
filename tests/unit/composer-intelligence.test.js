import { describe, expect, it } from 'vitest';
import {
  buildLocalOpportunities,
  buildWeeklyMemory,
  getRecommendedSlots
} from '@/lib/composer-intelligence';

describe('buildLocalOpportunities', () => {
  it('prioriza temas planejados e mantem a opcao de sugestao local', () => {
    const opportunities = buildLocalOpportunities({
      planItems: [{ topic: 'Cuidados apos a consulta', format: 'Carrossel', objective: 'educar' }],
      niche: 'medicina'
    });

    expect(opportunities[0]).toMatchObject({
      topic: 'Cuidados apos a consulta',
      format: 'Carrossel',
      goal: 'educar'
    });
    expect(opportunities).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Não sei. Me sugira algo.' })
    ]));
  });

  it('oferece caminhos locais uteis sem plano editorial', () => {
    const opportunities = buildLocalOpportunities({ niche: 'arquitetura' });

    expect(opportunities.length).toBeGreaterThanOrEqual(5);
    expect(opportunities.some((item) => /projeto|processo|inspiracao/i.test(item.label))).toBe(true);
  });
});

describe('buildWeeklyMemory', () => {
  it('resume formatos publicados sem linguagem tecnica', () => {
    const memory = buildWeeklyMemory([
      { format: 'CAROUSEL_ALBUM', content: 'Dicas de organizacao' },
      { format: 'REELS', content: 'Bastidores do atendimento' }
    ]);

    expect(memory).toContain('2 conteudos');
    expect(memory).toMatch(/carrossel/i);
    expect(memory).not.toMatch(/media_type|created_at|status/i);
  });

  it('explica de forma acolhedora quando nao ha historico recente', () => {
    expect(buildWeeklyMemory([])).toMatch(/primeiro conteudo|semana/i);
  });
});

describe('getRecommendedSlots', () => {
  it('usa os horarios medidos no diagnostico quando existem', () => {
    const result = getRecommendedSlots({
      calculated_metrics: { bestTimes: [{ weekday: 2, hour: 11, basis: 'measured' }] }
    });

    expect(result.hasMetricSignal).toBe(true);
    expect(result.recommendedSlots[0]).toMatchObject({ weekday: 2, time: '11:00' });
  });

  it('usa horarios iniciais quando o diagnostico nao tem sinal confiavel', () => {
    const result = getRecommendedSlots({
      calculated_metrics: { bestTimes: [{ weekday: 1, hour: 9, basis: 'heuristic' }] }
    });

    expect(result.hasMetricSignal).toBe(false);
    expect(result.recommendedSlots.length).toBeGreaterThan(0);
  });
});
