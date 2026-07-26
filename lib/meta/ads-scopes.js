// Escopos de anúncios são isolados do OAuth de Instagram: solicitar escrita
// acidentalmente pode conceder poder para gerar gasto em nome do cliente.
export const ADS_READ_SCOPES = ['ads_read', 'business_management'];
export const ADS_WRITE_SCOPES = ['ads_management'];

export function requestedAdsScopes(env = process.env) {
  return env?.META_ADS_WRITE_ENABLED === 'true'
    ? [...ADS_READ_SCOPES, ...ADS_WRITE_SCOPES]
    : ADS_READ_SCOPES;
}
