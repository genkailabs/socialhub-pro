// This integration is intentionally read-only. Never request permission to spend money.
export const ADS_READ_SCOPES = ['ads_read', 'business_management'];

export function requestedAdsScopes() {
  return ADS_READ_SCOPES;
}
