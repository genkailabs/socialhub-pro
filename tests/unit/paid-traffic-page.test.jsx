import { describe, expect, it } from 'vitest';
import { formatPaidMetric } from '@/components/paid-traffic/PaidTrafficKpis';
import { paidTrafficConnectionHref } from '@/components/paid-traffic/ConnectionChecklist';

describe('janela de trafego pago', () => {
  it('mostra metrica ausente sem inventar zero', () => {
    expect(formatPaidMetric(null, 'number')).toBe('—');
    expect(formatPaidMetric(undefined, 'percent')).toBe('—');
  });

  it('abre o OAuth especifico de anuncios para a marca ativa', () => {
    expect(paidTrafficConnectionHref('brand-1')).toBe('/api/meta/ads/oauth?brand_id=brand-1&return_to=%2Fpaid-traffic');
  });
});
