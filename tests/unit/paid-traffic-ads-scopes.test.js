import { describe, expect, it } from 'vitest';
import { ADS_READ_SCOPES, requestedAdsScopes } from '@/lib/meta/ads-scopes';

describe('escopos de anuncios Meta', () => {
  it('mantem o MVP somente leitura por padrao', () => {
    expect(ADS_READ_SCOPES).toEqual(['ads_read', 'business_management']);
    expect(requestedAdsScopes({})).toEqual(ADS_READ_SCOPES);
    expect(requestedAdsScopes({})).not.toContain('ads_management');
  });

  it('nunca pede escrita, mesmo com variavel de ambiente indevida', () => {
    expect(requestedAdsScopes({ META_ADS_WRITE_ENABLED: 'true' })).not.toContain('ads_management');
  });
});
