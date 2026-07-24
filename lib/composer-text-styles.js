// Estilos prontos de texto (PRD Story §10) e stickers próprios do SocialHub
// (§12). Cada estilo é um patch sobre os defaults de addLayer — depois de
// aplicado, todas as propriedades continuam editáveis.

export const TEXT_STYLES = [
  { id: 'moderno', label: 'Moderno', patch: { font: 'Poppins', weight: 700, color: '#FFFFFF' } },
  { id: 'forte', label: 'Forte', patch: { font: 'Anton', weight: 400, tt: 'upper', ls: 1, color: '#FFFFFF' } },
  { id: 'editorial', label: 'Editorial', patch: { font: 'Playfair Display', weight: 700, color: '#FFFFFF' } },
  { id: 'classico', label: 'Clássico', patch: { font: 'Merriweather', weight: 400, color: '#FFFFFF' } },
  { id: 'manuscrito', label: 'Manuscrito', patch: { font: 'Caveat', weight: 700, color: '#FFFFFF' } },
  { id: 'maquina', label: 'Máquina', patch: { font: 'Space Mono', weight: 400, color: '#FFFFFF' } },
  { id: 'divertido', label: 'Divertido', patch: { font: 'Baloo 2', weight: 700, color: '#FFD60A', strokeW: 1.5, strokeColor: '#1D1D1F' } },
  { id: 'elegante', label: 'Elegante', patch: { font: 'Cormorant Garamond', weight: 700, ls: 2, color: '#FFFFFF' } },
  { id: 'destaque', label: 'Destaque', patch: { font: 'Poppins', weight: 700, tt: 'upper', bgMode: 'box', bgFill: '#FFD60A', bgRadius: 10, color: '#1D1D1F' } },
  { id: 'contornado', label: 'Contornado', patch: { font: 'Anton', weight: 400, tt: 'upper', color: 'transparent', strokeW: 1.5, strokeColor: '#FFFFFF' } },
  { id: 'sombreado', label: 'Sombreado', patch: { font: 'Poppins', weight: 700, color: '#FFFFFF', shOn: true, shX: 0, shY: 4, shB: 10, shColor: 'rgba(0,0,0,0.65)' } },
  { id: 'faixa', label: 'Faixa', patch: { font: 'Montserrat', weight: 700, tt: 'upper', ls: 1, bgMode: 'box', bgFill: '#111111', bgRadius: 0, color: '#FFFFFF' } },
  { id: 'etiqueta', label: 'Etiqueta', patch: { font: 'Poppins', weight: 700, bgMode: 'line', bgFill: '#FFFFFF', bgRadius: 8, color: '#111111' } }
];

// Stickers gráficos próprios do SocialHub (§12) — camadas de texto com fundo,
// renderizadas de forma idêntica no canvas, na prévia e no arquivo final.
const STICKER_BASE = {
  type: 'text', font: 'Poppins', weight: 700, tt: 'upper', ls: 1,
  bgMode: 'box', bgRadius: 99, fs: 15, h: 36, align: 'center'
};

function sticker(text, bgFill, color, w) {
  return { label: text, preset: { ...STICKER_BASE, text, bgFill, color, w } };
}

export const SOCIALHUB_STICKERS = [
  sticker('Novo', '#FF375F', '#FFFFFF', 84),
  sticker('Oferta', '#FF9500', '#1D1D1F', 100),
  sticker('Promoção', '#FFD60A', '#1D1D1F', 138),
  sticker('Saiba mais', '#007AFF', '#FFFFFF', 146),
  sticker('Clique aqui', '#34C759', '#1D1D1F', 152),
  sticker('Link na bio', '#111111', '#FFFFFF', 148),
  sticker('Últimas vagas', '#D70015', '#FFFFFF', 178),
  sticker('Lançamento', '#5E5CE6', '#FFFFFF', 162),
  sticker('Em breve', '#1D1D1F', '#FFD60A', 122),
  sticker('Frete grátis', '#0A84FF', '#FFFFFF', 158),
  sticker('Desconto', '#FF375F', '#FFFFFF', 130),
  sticker('Confira', '#FFFFFF', '#1D1D1F', 108),
  sticker('Aproveite', '#34C759', '#FFFFFF', 132)
];

// Formas, linhas, setas, selos, etiquetas e balões (§13).
export const ELEMENT_SHAPES = [
  { label: 'Retângulo', preset: { type: 'shape', text: '', w: 110, h: 90, radius: 4, fill: '#007AFF' } },
  { label: 'Círculo', preset: { type: 'shape', text: '', w: 90, h: 90, radius: 99, fill: '#FF9500' } },
  { label: 'Pill', preset: { type: 'button', text: 'Saiba mais', w: 130, h: 42, fs: 14, radius: 99 } },
  { label: 'Selo', preset: { type: 'button', text: 'NOVO', w: 74, h: 74, fs: 14, radius: 99, fill: '#FF375F', ls: 1 } },
  { label: 'Etiqueta', preset: { type: 'button', text: 'ETIQUETA', w: 120, h: 34, fs: 13, radius: 6, fill: '#111111', ls: 1 } },
  { label: 'Balão', preset: { type: 'button', text: 'Fala aí!', w: 130, h: 52, fs: 15, radius: 18, fill: '#FFFFFF', color: '#1D1D1F' } }
];

export const ELEMENT_LINES = [
  { label: 'Linha fina', preset: { type: 'shape', text: '', w: 180, h: 3, radius: 99, fill: '#FFFFFF' } },
  { label: 'Linha grossa', preset: { type: 'shape', text: '', w: 180, h: 8, radius: 99, fill: '#FFFFFF' } },
  { label: 'Linha vertical', preset: { type: 'shape', text: '', w: 3, h: 140, radius: 99, fill: '#FFFFFF' } },
  { label: 'Seta', preset: { type: 'arrow', text: '', w: 160, h: 36, fill: '#FFFFFF' } },
  { label: 'Seta curta', preset: { type: 'arrow', text: '', w: 90, h: 30, fill: '#FFFFFF' } }
];

// Ícones em glifos universais — cobertos pelas fontes do sistema no canvas e
// pelo fallback do fontconfig no render final.
export const ELEMENT_ICONS = ['★', '☆', '♥', '✓', '✗', '→', '←', '↑', '↓', '●', '○', '▲', '■', '◆', '✶', '☼'];

export function iconPreset(glyph) {
  return { type: 'sticker', text: glyph, fs: 46, w: 60, h: 60, fill: 'transparent', color: '#FFFFFF' };
}
