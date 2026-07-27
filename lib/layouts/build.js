// Montagem da peça (PRD §3): estrutura + componentes + estilo + Brand Kit +
// conteúdo + imagem → superfície do Composer. Puro, sem I/O.
//
// A diferença para `lib/ai/art/*` é o produto final: lá sai um nó do satori que
// vira PNG achatado; aqui sai o MESMO objeto que o editor manipula
// (lib/composer-editor.js). É o que o §4 exige — "objetos editáveis, e não
// imagens prontas" — e o que permite o §16, abrir a peça já montada.

import { makeSurface } from '@/lib/composer-editor';
import { componentById, componentText } from '@/lib/layouts/components';
import { styleTypeScale, styleInsets, styleShadow, densityForText } from '@/lib/layouts/styles';
import { isSameText } from '@/lib/layouts/content';
import { resolveArtPalette, ensureReadableInk } from '@/lib/ai/art/palette';

// Largura média de caractere em fração do corpo da fonte. Estimativa: quem mede
// de verdade é o navegador. Serve para escolher o tamanho ANTES de desenhar.
const CHAR_WIDTH = { bold: 0.58, regular: 0.52 };

export function estimateLines(text, { fontSize, boxWidth, weight = 400, letterSpacing = 0 }) {
  const chars = String(text || '').length;
  if (!chars || !fontSize || !boxWidth) return 0;
  // O espaçamento entre letras entra na conta: o estilo Premium usa 4px por
  // caractere no selo, e sem isso a estimativa dizia que cabia numa linha
  // enquanto o render mostrava o texto vazando da pílula.
  const width = fontSize * (weight >= 600 ? CHAR_WIDTH.bold : CHAR_WIDTH.regular) + Math.max(0, Number(letterSpacing) || 0);
  // Palavra não parte no meio: a última de cada linha quase sempre desce
  // inteira, então a linha real leva menos texto que a conta por caractere.
  const perLine = Math.max(1, Math.floor((boxWidth / width) * 0.82));
  return Math.ceil(chars / perLine);
}

export function textFits(text, { fontSize, boxWidth, boxHeight, lineHeight = 1.2, weight = 400, letterSpacing = 0 }) {
  const lines = estimateLines(text, { fontSize, boxWidth, weight, letterSpacing });
  return lines * fontSize * lineHeight <= boxHeight + 0.5;
}

/**
 * Maior corpo em que o texto ainda cabe na caixa do slot.
 * Reduzir é a correção honesta do §14 "texto cortado": inventar espaço não dá,
 * e cortar o texto do usuário sem avisar é pior.
 */
export function fitTextSize(text, { fontSize, boxWidth, boxHeight, lineHeight = 1.2, weight = 400, letterSpacing = 0, floor = 9 }) {
  let size = Math.max(floor, Math.round(fontSize));
  while (size > floor) {
    if (textFits(text, { fontSize: size, boxWidth, boxHeight, lineHeight, weight, letterSpacing })) return size;
    size = Math.max(floor, Math.round(size * 0.94));
    if (size === floor) break;
  }
  return size;
}

/**
 * Corpo e espaçamento de um selo que precisa caber em uma linha.
 * Reduz o corpo primeiro; só depois abre mão do espaçamento do estilo.
 */
export function fitBadgeText(text, { fontSize, boxWidth, boxHeight, letterSpacing = 0 }) {
  for (const spacing of [letterSpacing, letterSpacing / 2, 0]) {
    const size = fitTextSize(text, { fontSize, boxWidth, boxHeight, lineHeight: 1.1, weight: 700, letterSpacing: spacing });
    if (textFits(text, { fontSize: size, boxWidth, boxHeight, lineHeight: 1.1, weight: 700, letterSpacing: spacing })) {
      return { fontSize: size, letterSpacing: spacing };
    }
  }
  return { fontSize: fitTextSize(text, { fontSize, boxWidth, boxHeight, lineHeight: 1.1, weight: 700 }), letterSpacing: 0 };
}

function rectFor(slot, { canvas, insets }) {
  const [cw, ch] = canvas;
  if (slot.bleed) {
    return {
      x: Math.round(slot.x * cw),
      y: Math.round(slot.y * ch),
      w: Math.round(slot.w * cw),
      h: Math.round(slot.h * ch)
    };
  }
  const innerW = cw - insets.x * 2;
  const innerH = ch - insets.top - insets.bottom;
  return {
    x: Math.round(insets.x + slot.x * innerW),
    y: Math.round(insets.top + slot.y * innerH),
    w: Math.round(slot.w * innerW),
    h: Math.round(slot.h * innerH)
  };
}

/**
 * Transforma a mídia para caber num retângulo.
 * `cover` preenche (recorta a sobra) e `contain` mostra tudo — nenhum dos dois
 * distorce, que é o que o §14 verifica.
 */
export function fitMediaToRect(media, rect, mode = 'cover') {
  const naturalW = Math.max(1, Number(media?.width) || rect.w);
  const naturalH = Math.max(1, Number(media?.height) || rect.h);
  const factor = mode === 'cover'
    ? Math.max(rect.w / naturalW, rect.h / naturalH)
    : Math.min(rect.w / naturalW, rect.h / naturalH);
  const w = Math.max(1, Math.round(naturalW * factor));
  const h = Math.max(1, Math.round(naturalH * factor));
  return {
    x: Math.round(rect.x + (rect.w - w) / 2),
    y: Math.round(rect.y + (rect.h - h) / 2),
    w,
    h,
    scale: 1,
    rot: 0
  };
}

// Sobre foto o texto é sempre claro; sobre painel de acento, a cor que contrasta
// com o acento. Centralizar aqui evita cada componente ter a própria regra e
// produzir a peça com texto invisível que o §14 depois reprova.
function inkFor({ palette, overImage, onPanel }) {
  // Sobre foto o secundário fica levemente translúcido para não competir com o
  // título; a sombra do glifo é o que garante a leitura.
  if (overImage) return { color: '#FFFFFF', muted: 'rgba(255,255,255,0.88)' };
  if (onPanel) return { color: palette.onAccent, muted: palette.onAccent };
  // O secundário nasce de uma mistura entre texto e fundo e costuma parar logo
  // abaixo de 4.5:1. Corrigir aqui evita que TODA peça precise da rodada de
  // correção do §14 pelo mesmo motivo.
  return { color: palette.ink, muted: ensureReadableInk(palette.muted, palette.bg) };
}

// Componentes que moram DENTRO de um bloco de cor. O fundo por trás do texto
// (`bgMode: box`) cola nas bordas do glifo — no render isso lê como erro de
// montagem. Aqui o bloco vira uma camada própria e o texto entra com margem.
const PANELLED = new Set(['comparacao', 'aviso', 'box-informativo']);

function insetRect(rect, padding) {
  return {
    x: rect.x + padding,
    y: rect.y + padding,
    w: Math.max(1, rect.w - padding * 2),
    h: Math.max(1, rect.h - padding * 2)
  };
}

/**
 * Retângulos que pintam o fundo da peça.
 *
 * O canvas do Composer é cinza escuro (`.canvas`, em VisualComposer.module.css);
 * sem estas camadas, uma peça de paleta clara saía com o texto escuro sobre o
 * cinza do editor — invisível. Só apareceu na inspeção do render.
 *
 * Quando há foto, o fundo não pode ser um retângulo único: a mídia fica ABAIXO
 * de todas as camadas, então um retângulo do canvas inteiro esconderia a foto.
 * Por isso o fundo é desenhado ao redor do retângulo da mídia.
 */
export function backgroundPanels(canvas, mediaRect = null) {
  const [cw, ch] = canvas;
  if (!mediaRect) return [{ x: 0, y: 0, w: cw, h: ch }];

  const left = Math.min(cw, Math.max(0, Math.round(mediaRect.x)));
  const top = Math.min(ch, Math.max(0, Math.round(mediaRect.y)));
  const right = Math.max(0, Math.min(cw, Math.round(mediaRect.x + mediaRect.w)));
  const bottom = Math.max(0, Math.min(ch, Math.round(mediaRect.y + mediaRect.h)));

  return [
    { x: 0, y: 0, w: cw, h: top },
    { x: 0, y: bottom, w: cw, h: ch - bottom },
    { x: 0, y: top, w: left, h: bottom - top },
    { x: right, y: top, w: cw - right, h: bottom - top }
  ].filter((rect) => rect.w > 0 && rect.h > 0);
}

function highlightPatch(style, palette) {
  if (style.highlight === 'box') return { bgMode: 'box', bgFill: palette.accent, bgRadius: style.radius, color: palette.onAccent };
  if (style.highlight === 'underline') return { bgMode: 'line', bgFill: palette.accent, bgRadius: 2, color: palette.onAccent };
  if (style.highlight === 'color') return { bgMode: 'none', color: palette.accent };
  return { bgMode: 'none' };
}

// Cada componente vira camada aqui. Um `switch` por id em vez de dados no
// catálogo porque o mapeamento depende do estilo E da paleta — deixar isso no
// catálogo obrigaria cada componente a conhecer as duas coisas.
function layerForSlot({ slot, component, rect, text, style, palette, scale, ink, index }) {
  const shadow = styleShadow(style) || {};
  const base = {
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    rot: 0, op: 1, hidden: false, locked: false,
    componentId: component.id,
    ...component.defaults
  };

  switch (component.id) {
    case 'painel':
      return { ...base, type: 'shape', shape: 'rect', text: '', fill: palette.surface, radius: style.radius };
    case 'sobreposicao':
      return { ...base, type: 'shape', shape: 'rect', text: '', fill: '#000000', op: 0.5, radius: 0 };
    case 'divisor':
      return { ...base, type: 'line', text: '', fill: palette.accent, h: Math.max(3, rect.h) };
    case 'selo-categoria': {
      // A pílula não cresce com o texto: quem cede é o corpo e, se ainda não
      // couber, o espaçamento entre letras — que é enfeite do estilo, não
      // conteúdo. Sem isso o selo quebrava em duas linhas e vazava no título.
      const badge = fitBadgeText(text, {
        fontSize: scale.eyebrow, boxWidth: rect.w * 0.86, boxHeight: rect.h,
        letterSpacing: style.letterSpacing.eyebrow
      });
      return {
        ...base, type: 'button', text, font: style.fonts.accent,
        fs: badge.fontSize,
        weight: 700, fill: palette.accent, color: palette.onAccent,
        radius: 999, ls: badge.letterSpacing,
        tt: style.uppercaseEyebrow ? 'upper' : 'none'
      };
    }
    case 'cta':
      return {
        ...base, type: 'button', text, font: style.fonts.accent,
        fs: fitTextSize(text, {
          fontSize: scale.cta, boxWidth: rect.w * 0.86, boxHeight: rect.h,
          lineHeight: 1.1, weight: 700
        }),
        weight: 700, fill: palette.accent, color: palette.onAccent,
        radius: style.radius >= 16 ? 999 : Math.max(6, style.radius), ...shadow
      };
    case 'titulo':
    case 'pergunta':
    case 'citacao':
      return {
        ...base, type: 'text', text,
        fs: fitTextSize(text, {
          fontSize: scale.title, boxWidth: rect.w, boxHeight: rect.h,
          lineHeight: component.defaults.lh, weight: style.titleWeight,
          letterSpacing: style.letterSpacing.title, floor: Math.round(scale.body * 1.6)
        }),
        font: style.fonts.title, weight: style.titleWeight,
        ls: style.letterSpacing.title, color: ink.color, fill: 'transparent',
        ...(ink.overImage ? shadowOverImage() : shadow)
      };
    case 'estatistica':
      return {
        ...base, type: 'text', text,
        fs: fitTextSize(text, { fontSize: scale.number, boxWidth: rect.w, boxHeight: rect.h, lineHeight: 1, weight: 800, floor: scale.title }),
        font: style.fonts.title, weight: 800, color: palette.accent, fill: 'transparent'
      };
    case 'destaque-palavra':
      return {
        ...base, type: 'text', text, fs: scale.subtitle, font: style.fonts.accent,
        weight: 800, align: 'center', ...highlightPatch(style, palette)
      };
    case 'comparacao':
    case 'aviso':
    case 'box-informativo':
      // O bloco de cor é uma camada à parte (ver PANELLED); aqui sobra só o
      // texto, já dentro da margem.
      return {
        ...base, type: 'text', text,
        fs: fitTextSize(text, { fontSize: scale.body, boxWidth: rect.w, boxHeight: rect.h, lineHeight: component.defaults.lh, weight: 600 }),
        font: style.fonts.body, color: palette.ink,
        bgMode: 'none', fill: 'transparent', radius: 0
      };
    case 'lista':
      return {
        ...base, type: 'text',
        // O número entra no texto da camada: continua editável e some junto se o
        // usuário apagar o item.
        text: `${(index ?? 0) + 1}. ${text}`,
        fs: fitTextSize(text, { fontSize: scale.body, boxWidth: rect.w * 0.9, boxHeight: rect.h, lineHeight: component.defaults.lh, weight: 600 }),
        font: style.fonts.body, color: ink.color, fill: 'transparent'
      };
    case 'estatistica-legenda':
    case 'subtitulo':
      return {
        ...base, type: 'text', text,
        fs: fitTextSize(text, { fontSize: scale.subtitle, boxWidth: rect.w, boxHeight: rect.h, lineHeight: component.defaults.lh, weight: 400 }),
        font: style.fonts.body, color: ink.muted, fill: 'transparent',
        ...(ink.overImage ? shadowOverImage() : {})
      };
    case 'logo':
      return {
        ...base, type: 'text', text: text.startsWith('@') ? text : `@${text}`,
        fs: scale.meta, font: style.fonts.accent, weight: 700,
        color: ink.color, fill: 'transparent'
      };
    default:
      return {
        ...base, type: 'text', text, fs: scale.meta, font: style.fonts.body,
        color: ink.muted, fill: 'transparent'
      };
  }
}

// Sobre foto o texto claro precisa de sombra, senão some no trecho claro da
// imagem — mesmo motivo do véu, aplicado ao próprio glifo.
function shadowOverImage() {
  return { shOn: true, shX: 0, shY: 2, shB: 10, shColor: 'rgba(0,0,0,0.6)' };
}

/**
 * Monta uma superfície do Composer a partir do plano.
 *
 * @returns {{ surface, palette, scale, insets, skipped }}
 */
export function buildLayoutSurface({
  structure, style, content = {}, kit = null, brandColor = '', niche = '',
  canvas = [430, 430], media = null, idPrefix = 'lay'
} = {}) {
  const palette = resolveArtPalette({ kit, brandColor, niche });
  const density = structure?.density || densityForText([content.title, content.subtitle, ...(content.bullets || [])].join(' '));
  const [cw, ch] = canvas;
  const scale = styleTypeScale(style, { width: cw, height: ch, density });
  const insets = styleInsets(style, { width: cw, height: ch });

  const surface = makeSurface(media || null);
  const skipped = [];
  const placed = [];
  const overImage = Boolean(structure?.inkOverImage && media);

  let index = 0;
  for (const slot of structure?.slots || []) {
    const component = componentById(slot.component);
    if (!component) continue;

    if (component.layerType === 'media') {
      if (!media) {
        skipped.push(slot.component);
        continue;
      }
      const rect = rectFor(slot, { canvas, insets });
      surface.bg = fitMediaToRect(media, rect, slot.bleed ? 'cover' : 'contain');
      continue;
    }

    // O véu só existe para proteger o texto sobre foto: sem foto ele vira uma
    // mancha preta sobre o fundo da marca.
    if (component.id === 'sobreposicao' && !media) {
      skipped.push(slot.component);
      continue;
    }

    const text = componentText(component, content, slot.index);
    if (component.field && !text) {
      // Slot vazio não pode virar caixa fantasma no canvas (§14).
      skipped.push(slot.component);
      continue;
    }
    // O mesmo texto em dois slots (apoio e box informativo, por exemplo) lê como
    // erro de montagem. Quem chegou primeiro fica.
    if (text && placed.some((existing) => isSameText(existing, text))) {
      skipped.push(slot.component);
      continue;
    }
    if (text) placed.push(text);

    const slotRect = rectFor(slot, { canvas, insets });
    const onPanel = slot.onPanel;
    const ink = { ...inkFor({ palette, overImage: overImage && !onPanel, onPanel }), overImage: overImage && !onPanel };

    let rect = slotRect;
    if (PANELLED.has(component.id)) {
      const padding = Math.max(6, Math.round(Math.min(slotRect.w, slotRect.h) * 0.1));
      rect = insetRect(slotRect, padding);
      surface.layers.push({
        ...blankLayer(`${idPrefix}-${structure.id}-${index}-fundo`),
        componentId: 'painel', type: 'shape', shape: 'rect', text: '',
        x: slotRect.x, y: slotRect.y, w: slotRect.w, h: slotRect.h,
        fill: palette.surface, radius: style.radius
      });
    }

    surface.layers.push({
      ...blankLayer(`${idPrefix}-${structure.id}-${index}`),
      ...layerForSlot({ slot, component, rect, text, style, palette, scale, ink, index: slot.index })
    });
    index += 1;
  }

  // O fundo entra por último no código e primeiro na pilha: camadas renderizam
  // na ordem do array, então o fundo precisa ficar atrás de tudo.
  const mediaRect = media && surface.bg?.w ? surface.bg : null;
  surface.layers.unshift(...backgroundPanels(canvas, mediaRect).map((rect, position) => ({
    ...blankLayer(`${idPrefix}-${structure.id}-fundo-${position}`),
    componentId: 'painel', type: 'shape', shape: 'rect', text: '',
    ...rect, fill: palette.bg, radius: 0, locked: true
  })));

  return { surface, palette, scale, insets, skipped, density };
}

function blankLayer(id) {
  return {
    id, type: 'text', text: '', x: 0, y: 0, w: 0, h: 0, fs: 12, weight: 400,
    italic: false, align: 'left', color: '#111111', fill: 'transparent',
    font: 'Poppins', rot: 0, op: 1, hidden: false, locked: false, radius: 0,
    ls: 0, lh: 1.2, tt: 'none',
    bgMode: 'none', bgFill: '#111111', bgRadius: 8, strokeW: 0, strokeColor: '#111111',
    shOn: false, shX: 0, shY: 3, shB: 8, shColor: 'rgba(0,0,0,0.55)'
  };
}
