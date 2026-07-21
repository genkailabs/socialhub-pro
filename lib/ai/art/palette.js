// Paleta da arte a partir do Brand DNA (§18). Puro, sem I/O.
//
// Substitui a paleta antiga baseada no azul iOS (#007AFF), que dava a todas as
// marcas a mesma cara. Agora a ordem é: cor real da marca > estilo do nicho >
// neutro. O neutro é o último recurso, não o padrão.
//
// `followsBrandKit` sai junto de propósito: o controle de qualidade (§19)
// precisa saber se a arte usou a identidade da marca ou um fallback.

import { styleForNiche } from '@/lib/ai/art/style';
import { contrastRatio, parseHex, MIN_CONTRAST_BODY } from '@/lib/ai/art/quality';

// Neutro quente, alinhado ao resto do produto. Sem azul de sistema.
export const NEUTRAL_PALETTE = {
  bg: '#F7F6F3',
  surface: '#FFFFFF',
  ink: '#211E1B',
  muted: '#6B6660',
  accent: '#4F46E5'
};

const isHex = (v) => Boolean(parseHex(v));
const toHex = (v) => {
  const rgb = parseHex(v);
  if (!rgb) return null;
  const p = (n) => n.toString(16).padStart(2, '0');
  return `#${p(rgb.r)}${p(rgb.g)}${p(rgb.b)}`.toUpperCase();
};

function mix(corA, corB, peso) {
  const a = parseHex(corA);
  const b = parseHex(corB);
  if (!a || !b) return corA;
  const t = Math.min(1, Math.max(0, peso));
  const canal = (x, y) => Math.round(x + (y - x) * t);
  const p = (n) => n.toString(16).padStart(2, '0');
  return `#${p(canal(a.r, b.r))}${p(canal(a.g, b.g))}${p(canal(a.b, b.b))}`.toUpperCase();
}

/**
 * Ajusta o texto até atingir contraste legível sobre o fundo.
 *
 * É a correção automática do §19 aplicada na origem: em vez de reprovar a arte
 * e refazer tudo por causa de contraste, empurramos o texto para preto ou
 * branco até passar. Só desiste depois de esgotar o ajuste.
 */
export function ensureReadableInk(ink, bg, minimo = MIN_CONTRAST_BODY) {
  if (!isHex(ink) || !isHex(bg)) return ink;
  if ((contrastRatio(ink, bg) || 0) >= minimo) return toHex(ink);

  const fundoClaro = (contrastRatio('#000000', bg) || 0) >= (contrastRatio('#FFFFFF', bg) || 0);
  const alvo = fundoClaro ? '#000000' : '#FFFFFF';

  let melhor = toHex(ink);
  for (let passo = 1; passo <= 10; passo++) {
    const candidato = mix(ink, alvo, passo / 10);
    melhor = candidato;
    if ((contrastRatio(candidato, bg) || 0) >= minimo) return candidato;
  }
  return melhor;
}

/**
 * Monta a paleta da arte.
 *
 * @param {object} params
 * @param {object} params.kit        Brand Kit (pode ter kit.palette).
 * @param {string} params.brandColor Cor da marca (fallback do acento).
 * @param {string} params.niche      Nicho, para o estilo visual (§14).
 */
export function resolveArtPalette({ kit = null, brandColor = '', niche = '' } = {}) {
  const doKit = (kit && typeof kit.palette === 'object' && kit.palette) || {};
  const estilo = styleForNiche(niche);

  // O acento é o sinal mais forte da marca: cor do kit, depois cor da marca,
  // depois a do nicho.
  const acentoBruto = [doKit.accent, doKit.primary, brandColor, estilo.accentFallback]
    .find((c) => isHex(c));

  const usouCorDaMarca = isHex(doKit.accent) || isHex(doKit.primary) || isHex(brandColor);

  const fundoBruto = [doKit.bg, estilo.gradient[0]].find((c) => isHex(c)) || NEUTRAL_PALETTE.bg;
  const superficie = [doKit.surface, estilo.gradient[1]].find((c) => isHex(c)) || NEUTRAL_PALETTE.surface;
  const tintaBruta = [doKit.ink].find((c) => isHex(c))
    || (estilo.surfaceMode === 'light' ? NEUTRAL_PALETTE.ink : '#F5F4F2');

  const bg = toHex(fundoBruto);
  const ink = ensureReadableInk(tintaBruta, bg);
  const accent = toHex(acentoBruto) || NEUTRAL_PALETTE.accent;

  return {
    bg,
    surface: toHex(superficie),
    ink,
    // Secundário nasce do texto, então acompanha automaticamente fundo claro
    // ou escuro em vez de ser um cinza fixo que some no escuro.
    muted: mix(ink, bg, 0.45),
    accent,
    // Cor do texto sobre o acento: o que tiver mais contraste, nunca "chute".
    onAccent: (contrastRatio('#FFFFFF', accent) || 0) >= (contrastRatio('#111111', accent) || 0) ? '#FFFFFF' : '#111111',
    gradient: [bg, toHex(superficie)],
    surfaceMode: estilo.surfaceMode,
    niche: estilo.id,
    // §19 precisa saber se a identidade da marca foi usada de verdade.
    followsBrandKit: Boolean(usouCorDaMarca)
  };
}

// Tamanhos suportados. A regra proporcional pelo lado menor faz feed e story
// compartilharem escala, layouts e validação — sem renderizador paralelo.
export const ART_SIZES = {
  square: { id: 'square', width: 1080, height: 1080, label: 'Feed 1:1' },
  story: { id: 'story', width: 1080, height: 1920, label: 'Story 9:16' }
};

export function resolveSize(size) {
  if (size && typeof size === 'object' && size.width && size.height) return size;
  return ART_SIZES[size] || ART_SIZES.square;
}
