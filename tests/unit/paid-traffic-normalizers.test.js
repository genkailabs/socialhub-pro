import { describe, expect, it } from 'vitest';
import { normalizeInsight, summarizeInsights } from '@/lib/paid-traffic/normalizers';

describe('normalizacao de insights pagos', () => {
  it('preserva moeda e calcula CTR quando ha impressoes', () => {
    expect(normalizeInsight({ spend: '12.30', impressions: '1000', reach: '700', inline_link_clicks: '15' }, 'BRL'))
      .toMatchObject({ spend: 12.3, impressions: 1000, reach: 700, linkClicks: 15, ctr: 1.5, currency: 'BRL' });
  });

  it('nao transforma metrica ausente em zero', () => {
    const insight = normalizeInsight({ spend: '0', impressions: '0' }, 'BRL');
    expect(insight.ctr).toBeNull();
    expect(insight.cpc).toBeNull();
    expect(insight.linkClicks).toBeNull();
  });

  it('nao soma contas com moedas diferentes', () => {
    expect(() => summarizeInsights([
      normalizeInsight({ spend: '10', impressions: '100' }, 'BRL'),
      normalizeInsight({ spend: '10', impressions: '100' }, 'USD')
    ])).toThrow('moedas diferentes');
  });

  it('resume snapshots da mesma campanha sem duplicar a linha na tabela', () => {
    const rows = [
      { metaObjectId: 'c1', currency: 'BRL', spend: 5, impressions: 100, linkClicks: 2 },
      { metaObjectId: 'c1', currency: 'BRL', spend: 7, impressions: 200, linkClicks: 4 }
    ];
    expect(summarizeInsights(rows)).toMatchObject({ spend: 12, impressions: 300, linkClicks: 6, ctr: 2 });
  });
});
