import { describe, expect, it } from 'vitest';
import { chartDataForEvidence, detailsHrefForRecommendation, formatInsightValue, formatVariation } from '@/lib/marketing-insight';

describe('card de insight de marketing', () => {
  const evidence = { metric: 'Variação de seguidores', currentValue: 80, previousValue: 100, variation: -20, period: 'últimos 7 dias', source: 'Instagram' };

  it('monta o gráfico somente com valores reais atual e anterior', () => {
    expect(chartDataForEvidence(evidence)).toEqual([
      { label: 'Período anterior', value: 100 },
      { label: 'Período atual', value: 80 }
    ]);
    expect(chartDataForEvidence({ ...evidence, previousValue: undefined })).toEqual([]);
  });

  it('formata valor e comparação para leitura simples', () => {
    expect(formatInsightValue(1.5, 'Frequência de publicação')).toBe('1,5 por semana');
    expect(formatVariation(-18)).toBe('-18%');
  });

  it('leva ao relatório da rede e da métrica correspondente', () => {
    expect(detailsHrefForRecommendation({ channel: 'instagram', evidence: [evidence] }))
      .toBe('/metrics?channel=instagram&metric=Varia%C3%A7%C3%A3o%20de%20seguidores');
  });
});
