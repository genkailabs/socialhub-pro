// Funções puras de marca (seguras para importar em qualquer lugar: server, client, testes).
// Acesso a dados (Supabase/cookies) fica em lib/brands-data.js.

export const ACTIVE_COOKIE = 'active_brand_id';
const DEFAULT_COLOR = '#007AFF';

export function slugHandle(name) {
  return '@' + String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function brandFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle || slugHandle(row.name),
    category: row.category || 'Geral',
    color: row.color || DEFAULT_COLOR
  };
}

export function validateBrandName(name) {
  const trimmed = String(name || '').trim();
  if (trimmed.length < 2) throw new Error('O nome da marca precisa de pelo menos 2 caracteres.');
  return trimmed;
}

export function resolveActive(brands, activeId) {
  if (!brands.length) return null;
  return brands.find((b) => b.id === activeId) || brands[0];
}
