import { describe, expect, it } from 'vitest';
import { normalizeReportChannel, reportHref, reportSectionForMetric } from '@/lib/reports/channel-adapters';

describe('adaptadores de relatorios por canal', () => {
  it('mantem a metrica no canal do insight', () => {
    expect(normalizeReportChannel('instagram')).toBe('instagram');
    expect(reportSectionForMetric('instagram', 'Variação de seguidores')).toBe('crescimento');
    expect(reportHref('instagram', 'Variação de seguidores')).toBe('/metrics?channel=instagram&metric=Varia%C3%A7%C3%A3o+de+seguidores');
  });

  it('nao usa metrica de uma rede para selecionar secao de outra', () => {
    expect(reportSectionForMetric('youtube', 'Taxa de engajamento')).toBeNull();
    expect(normalizeReportChannel('linkedin')).toBe('overview');
  });
});
