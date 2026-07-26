import 'server-only';
import { randomUUID } from 'node:crypto';

export const ADS_OAUTH_STATE_COOKIE = 'meta_ads_oauth_state';
export const ADS_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export function createAdsOAuthState({ brandId, userId, returnTo, now = Date.now(), nonce = randomUUID() }) {
  return { state: nonce, cookieValue: JSON.stringify({ nonce, brandId, userId, returnTo, issuedAt: now }) };
}

export function readAdsOAuthState({ state, cookieValue, now = Date.now() }) {
  if (typeof state !== 'string' || typeof cookieValue !== 'string') return null;
  try {
    const saved = JSON.parse(cookieValue);
    const expiresAt = Number(saved.issuedAt) + ADS_OAUTH_STATE_TTL_SECONDS * 1000;
    if (!saved.nonce || state !== saved.nonce || !saved.brandId || !saved.userId || !Number.isFinite(expiresAt) || now > expiresAt) return null;
    return saved;
  } catch { return null; }
}
