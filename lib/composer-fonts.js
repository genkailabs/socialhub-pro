// Biblioteca de fontes licenciadas (SIL Open Font License, via Google Fonts).
// Os arquivos TTF ficam em public/fonts e são usados tanto no canvas (via
// @font-face) quanto na renderização final no servidor (via fontconfig).

export const FONT_CATEGORIES = [
  'Modernas',
  'Fortes',
  'Editoriais',
  'Clássicas',
  'Manuscritas',
  'Monoespaçadas',
  'Divertidas',
  'Elegantes'
];

export const FONT_LIBRARY = [
  { id: 'poppins', family: 'Poppins', category: 'Modernas', weights: [400, 700], fallback: 'sans-serif' },
  { id: 'montserrat', family: 'Montserrat', category: 'Modernas', weights: [400, 700], fallback: 'sans-serif' },
  { id: 'anton', family: 'Anton', category: 'Fortes', weights: [400], fallback: 'sans-serif' },
  { id: 'archivo-black', family: 'Archivo Black', category: 'Fortes', weights: [400], fallback: 'sans-serif' },
  { id: 'playfair-display', family: 'Playfair Display', category: 'Editoriais', weights: [400, 700], fallback: 'serif' },
  { id: 'lora', family: 'Lora', category: 'Editoriais', weights: [400, 700], fallback: 'serif' },
  { id: 'merriweather', family: 'Merriweather', category: 'Clássicas', weights: [400, 700], fallback: 'serif' },
  { id: 'eb-garamond', family: 'EB Garamond', category: 'Clássicas', weights: [400, 700], fallback: 'serif' },
  { id: 'caveat', family: 'Caveat', category: 'Manuscritas', weights: [400, 700], fallback: 'cursive' },
  { id: 'pacifico', family: 'Pacifico', category: 'Manuscritas', weights: [400], fallback: 'cursive' },
  { id: 'jetbrains-mono', family: 'JetBrains Mono', category: 'Monoespaçadas', weights: [400, 700], fallback: 'monospace' },
  { id: 'space-mono', family: 'Space Mono', category: 'Monoespaçadas', weights: [400, 700], fallback: 'monospace' },
  { id: 'fredoka', family: 'Fredoka', category: 'Divertidas', weights: [400, 600], fallback: 'sans-serif' },
  { id: 'baloo-2', family: 'Baloo 2', category: 'Divertidas', weights: [400, 700], fallback: 'sans-serif' },
  { id: 'cormorant-garamond', family: 'Cormorant Garamond', category: 'Elegantes', weights: [400, 700], fallback: 'serif' },
  { id: 'marcellus', family: 'Marcellus', category: 'Elegantes', weights: [400], fallback: 'serif' }
];

const BY_FAMILY = new Map(FONT_LIBRARY.map((font) => [font.family, font]));

export function findFont(family) {
  return BY_FAMILY.get(family) || null;
}

// Camadas antigas guardam 'system-ui', 'Georgia' ou 'ui-monospace'.
export function fontFamilyCss(family) {
  const font = BY_FAMILY.get(family);
  if (font) return `'${font.family}', ${font.fallback}`;
  return family || 'system-ui';
}

export function fontsByCategory() {
  return FONT_CATEGORIES.map((category) => ({
    category,
    fonts: FONT_LIBRARY.filter((font) => font.category === category)
  }));
}

// Peso efetivo: fontes de peso único ignoram negrito para não gerar faux-bold
// divergente entre canvas e render final.
export function resolveFontWeight(family, weight) {
  const font = BY_FAMILY.get(family);
  if (!font) return weight;
  const target = Number(weight) || 400;
  return font.weights.reduce((best, candidate) => (
    Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best
  ), font.weights[0]);
}
