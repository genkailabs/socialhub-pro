import { describe, expect, it } from 'vitest';
import { rankRecommendationOpportunities, selectSingleRecommendation } from '@/lib/marketing-recommendations';

describe('motor de recomendação única', () => {
  it('prioriza queda real de seguidores sobre outras oportunidades', () => {
    const recommendation = selectSingleRecommendation({
      hasApprovedDna: true,
      strategy: { objectives: { main: 'Atrair pacientes' }, pillars: ['Implantes'] },
      audit: { calculated_metrics: { lowData: false, growth: { start: 100, end: 80, delta: -20 }, frequency: { total: 5, perWeek: 0.5 } } }
    });
    expect(recommendation.sourceType).toBe('performance_drop');
    expect(recommendation.evidence[0]).toMatchObject({ metric: 'Variação de seguidores', currentValue: 80, previousValue: 100, variation: -20 });
  });

  it('não inventa desempenho quando há poucos dados', () => {
    const recommendation = selectSingleRecommendation({ hasApprovedDna: true, audit: { calculated_metrics: { lowData: true, growth: { start: 10, end: 2, delta: -8 } } } });
    expect(recommendation.sourceType).toBe('brand_strategy');
    expect(recommendation.confidence).toBe('low');
    expect(recommendation.finding).toMatch(/não há histórico suficiente/i);
  });

  it('devolve oportunidades ordenadas, mas expõe apenas a primeira como recomendação', () => {
    const opportunities = rankRecommendationOpportunities({ hasApprovedDna: true, audit: { calculated_metrics: { lowData: false, frequency: { total: 2, perWeek: 0.4 } } } });
    expect(opportunities[0].sourceType).toBe('consistency');
    expect(selectSingleRecommendation({ hasApprovedDna: true, audit: { calculated_metrics: { lowData: false, frequency: { total: 2, perWeek: 0.4 } } } }).title).toBe(opportunities[0].title);
  });
});

describe('aprendizado nas recomendações', () => {
  it('considera um aprendizado positivo ao escolher a próxima prioridade', () => {
    const recommendation = selectSingleRecommendation({
      hasApprovedDna: true,
      audit: { calculated_metrics: { lowData: false } },
      learningSignals: [{ format: 'carousel', topic: 'implantes', pillar: 'educação', metric_name: 'salvamentos', baseline_value: 10, observed_value: 15, comparison_percent: 50 }]
    });
    expect(recommendation.title).toMatch(/formato recomendado funcionou/i);
    expect(recommendation.contentPlan.format).toBe('carousel');
  });
});
