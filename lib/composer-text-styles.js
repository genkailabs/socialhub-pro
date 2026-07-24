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
  sticker('Arraste para cima', '#5856D6', '#FFFFFF', 208),
  sticker('Confira', '#FFFFFF', '#1D1D1F', 108),
  sticker('Aproveite', '#34C759', '#FFFFFF', 132),
  sticker('Vagas limitadas', '#FF9500', '#1D1D1F', 190)
];

// Formas (§5): type 'shape' desenha geometria própria (prop `shape` define o
// traçado: rect | ellipse | triangle | star | hexagon); type 'button' é uma
// forma com texto editável. `keywords` alimentam a busca do painel (§4) —
// sempre minúsculas e sem acento.
export const ELEMENT_SHAPES = [
  { label: 'Quadrado', keywords: ['quadrado', 'caixa', 'bloco'], preset: { type: 'shape', shape: 'rect', text: '', w: 90, h: 90, radius: 0, fill: '#007AFF' } },
  { label: 'Retângulo', keywords: ['retangulo', 'caixa', 'banner'], preset: { type: 'shape', shape: 'rect', text: '', w: 130, h: 84, radius: 0, fill: '#007AFF' } },
  { label: 'Retângulo arredondado', keywords: ['retangulo', 'arredondado', 'cartao'], preset: { type: 'shape', shape: 'rect', text: '', w: 130, h: 84, radius: 16, fill: '#5E5CE6' } },
  { label: 'Círculo', keywords: ['circulo', 'bola', 'redondo'], preset: { type: 'shape', shape: 'ellipse', text: '', w: 90, h: 90, radius: 0, fill: '#FF9500' } },
  { label: 'Elipse', keywords: ['elipse', 'oval'], preset: { type: 'shape', shape: 'ellipse', text: '', w: 130, h: 84, radius: 0, fill: '#FF9500' } },
  { label: 'Triângulo', keywords: ['triangulo', 'ponta'], preset: { type: 'shape', shape: 'triangle', text: '', w: 100, h: 90, radius: 0, fill: '#34C759' } },
  { label: 'Estrela', keywords: ['estrela', 'destaque', 'favorito'], preset: { type: 'shape', shape: 'star', text: '', w: 100, h: 100, radius: 0, fill: '#FFD60A' } },
  { label: 'Hexágono', keywords: ['hexagono', 'poligono', 'colmeia'], preset: { type: 'shape', shape: 'hexagon', text: '', w: 100, h: 90, radius: 0, fill: '#FF375F' } },
  { label: 'Balão', keywords: ['balao', 'fala', 'conversa'], preset: { type: 'button', text: 'Fala aí!', w: 130, h: 52, fs: 15, radius: 18, fill: '#FFFFFF', color: '#1D1D1F' } },
  { label: 'Faixa', keywords: ['faixa', 'tarja', 'destaque'], preset: { type: 'button', text: 'SUA FAIXA', w: 170, h: 38, fs: 13, radius: 0, fill: '#111111', ls: 1 } },
  { label: 'Pill', keywords: ['pill', 'botao', 'capsula'], preset: { type: 'button', text: 'Saiba mais', w: 130, h: 42, fs: 14, radius: 99 } }
];

// Linhas e setas (§7). Em `line`/`arrow`, a espessura visual vem do `h` da
// camada; `dash` e `cap` controlam o traço; `heads`/`curve` variam a seta.
export const ELEMENT_LINES = [
  { label: 'Linha reta', keywords: ['linha', 'reta', 'divisor'], preset: { type: 'line', dash: 'solid', cap: 'butt', text: '', w: 180, h: 4, fill: '#FFFFFF' } },
  { label: 'Linha pontilhada', keywords: ['linha', 'pontilhada', 'pontos'], preset: { type: 'line', dash: 'dotted', cap: 'round', text: '', w: 180, h: 4, fill: '#FFFFFF' } },
  { label: 'Linha tracejada', keywords: ['linha', 'tracejada', 'tracos'], preset: { type: 'line', dash: 'dashed', cap: 'butt', text: '', w: 180, h: 4, fill: '#FFFFFF' } },
  { label: 'Linha arredondada', keywords: ['linha', 'arredondada', 'extremidades'], preset: { type: 'line', dash: 'solid', cap: 'round', text: '', w: 180, h: 6, fill: '#FFFFFF' } },
  { label: 'Seta simples', keywords: ['seta', 'direcao', 'apontar'], preset: { type: 'arrow', heads: 1, curve: false, text: '', w: 160, h: 36, fill: '#FFFFFF' } },
  { label: 'Seta dupla', keywords: ['seta', 'dupla', 'dois lados'], preset: { type: 'arrow', heads: 2, curve: false, text: '', w: 170, h: 36, fill: '#FFFFFF' } },
  { label: 'Seta curva', keywords: ['seta', 'curva', 'arco'], preset: { type: 'arrow', heads: 1, curve: true, text: '', w: 150, h: 60, fill: '#FFFFFF' } }
];

// Ícones em glifos universais — cobertos pelas fontes do sistema no canvas e
// pelo fallback do fontconfig no render final.
export const ELEMENT_ICONS = ['★', '☆', '♥', '✓', '✗', '→', '←', '↑', '↓', '●', '○', '▲', '■', '◆', '✶', '☼'];

export function iconPreset(glyph) {
  return { type: 'sticker', text: glyph, fs: 46, w: 60, h: 60, fill: 'transparent', color: '#FFFFFF' };
}
