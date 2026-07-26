// Para onde o OAuth pode devolver a pessoa depois de conectar.
//
// Whitelist explícita, e não validação por formato. "Começa com barra" é a
// armadilha clássica: `//evil.com` passa em quase toda regex desse tipo e o
// navegador trata como host externo — open redirect pronto.

export const OAUTH_RETURN_ALLOWED = [
  '/connections',
  '/instagram/diagnostico',
  '/brand-kit',
  '/dashboard',
  '/paid-traffic'
];

export const OAUTH_RETURN_DEFAULT = '/connections';

export function safeReturnTo(value) {
  if (!value || typeof value !== 'string') return null;
  return OAUTH_RETURN_ALLOWED.includes(value) ? value : null;
}
