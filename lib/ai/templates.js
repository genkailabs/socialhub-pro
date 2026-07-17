// Templates de criativo on-brand (render via next/og). Puro/sem I/O.
export const TEMPLATES = ['news', 'quote', 'tips_carousel', 'promo', 'stat'];

export const TEMPLATE_LABELS = {
  news: 'Notícia / informativo',
  quote: 'Frase / citação',
  tips_carousel: 'Carrossel de dicas',
  promo: 'Promoção / oferta',
  stat: 'Estatística / dado'
};

// Paleta padrão (fallback) quando a marca não tem Brand Kit configurado.
export const DEFAULT_PALETTE = {
  bg: '#0F1424',
  surface: '#1A2036',
  ink: '#FFFFFF',
  muted: '#9AA6C0',
  accent: '#6366F1'
};

export function resolvePalette(palette) {
  const p = palette && typeof palette === 'object' ? palette : {};
  return {
    bg: p.bg || DEFAULT_PALETTE.bg,
    surface: p.surface || DEFAULT_PALETTE.surface,
    ink: p.ink || DEFAULT_PALETTE.ink,
    muted: p.muted || DEFAULT_PALETTE.muted,
    accent: p.accent || p.primary || DEFAULT_PALETTE.accent
  };
}

export function isTemplate(t) {
  return TEMPLATES.includes(t);
}
