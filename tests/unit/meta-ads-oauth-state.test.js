import { describe, expect, it } from 'vitest';
import { ADS_OAUTH_STATE_TTL_SECONDS, createAdsOAuthState, readAdsOAuthState } from '@/lib/meta/ads-oauth-state';

describe('state do OAuth de anuncios', () => {
  it('aceita apenas o nonce que ficou no cookie seguro', () => {
    const created = createAdsOAuthState({ brandId: 'brand-1', userId: 'user-1', returnTo: '/paid-traffic', now: 1000, nonce: 'nonce-1' });
    expect(readAdsOAuthState({ state: 'nonce-1', cookieValue: created.cookieValue, now: 1001 })).toMatchObject({ brandId: 'brand-1', userId: 'user-1' });
    expect(readAdsOAuthState({ state: 'alterado', cookieValue: created.cookieValue, now: 1001 })).toBeNull();
  });

  it('recusa state vencido', () => {
    const created = createAdsOAuthState({ brandId: 'brand-1', userId: 'user-1', returnTo: '/paid-traffic', now: 1000, nonce: 'nonce-1' });
    expect(readAdsOAuthState({ state: 'nonce-1', cookieValue: created.cookieValue, now: 1000 + ADS_OAUTH_STATE_TTL_SECONDS * 1000 + 1 })).toBeNull();
  });
});
