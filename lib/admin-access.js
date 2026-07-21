export const AI_COSTS_ADMIN_EMAIL = 'genkailabs@gmail.com';

export function canAccessAICosts(email) {
  return String(email || '').trim().toLowerCase() === AI_COSTS_ADMIN_EMAIL;
}
