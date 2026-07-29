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
import { resolveArtPalette, ensureReadableInk, mix } from '@/lib/ai/art/palette';

// Largura média de caractere em fração do corpo da fonte. Estimativa: quem mede
// de verdade é o navegador. Serve para escolher o tamanho ANTES de desenhar.
const CHAR_WIDTH = { bold: 0.58, regular: 0.52 };

// Marcador que o item já traz escrito: bullet de qualquer feitio, ou número
// seguido de ponto/parêntese. Quem numera a lista é o layout (o slot sabe a
// posição); o marcador digitado só duplica — "1. • Organiza compromissos".
//
// O número só conta como marcador quando vem com ponto ou parêntese. Sem isso,
// "10 motivos para revisar" perderia o "10", que é parte da frase.
const LEADING_MARKER = /^\s*(?:[•·▪◦‣*•]|[-–—]|\d{1,2}[.)])\s+/;

export function stripLeadingMarker(text) {
  return String(text || '').replace(LEADING_MARKER, '');
}

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
function inkFor({ palette, overImage, onPanel, onSurface }) {
  // Sobre foto o secundário fica levemente translúcido para não competir com o
  // título; a sombra do glifo é o que garante a leitura.
  if (overImage) return { color: '#FFFFFF', muted: 'rgba(255,255,255,0.88)' };
  if (onPanel) return { color: palette.onAccent, muted: palette.onAccent };
  // Sobre o painel da estrutura a tinta é a que contrasta com `surface`, e não
  // a calculada para `bg`. Era daqui que saía o título cinza-lavado da manchete:
  // a cor certa nunca era escolhida, só empurrada pela correção automática até
  // passar raspando no mínimo de contraste.
  if (onSurface) {
    return {
      color: palette.onSurface || palette.ink,
      muted: ensureReadableInk(mix(palette.onSurface || palette.ink, palette.surface, 0.35), palette.surface)
    };
  }
  // O secundário nasce de uma mistura entre texto e fundo e costuma parar logo
  // abaixo de 4.5:1. Corrigir aqui evita que TODA peça precise da rodada de
  // correção do §14 pelo mesmo motivo.
  return { color: palette.ink, muted: ensureReadableInk(palette.muted, palette.bg) };
}

/** O slot está por cima de um painel da própria estrutura? */
function coveredByPanel(slotRect, panelRects) {
  const area = slotRect.w * slotRect.h;
  if (area <= 0) return false;
  return panelRects.some((panel) => {
    const overlap = Math.max(0, Math.min(slotRect.x + slotRect.w, panel.x + panel.w) - Math.max(slotRect.x, panel.x))
      * Math.max(0, Math.min(slotRect.y + slotRect.h, panel.y + panel.h) - Math.max(slotRect.y, panel.y));
    return overlap > area * 0.6;
  });
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
function layerForSlot({ slot, component, rect, text, style, palette, scale, ink, index, cover = false }) {
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
      // 0.5 não bastava: o render mostrou título branco sobre a parte clara da
      // foto com contraste raspando o mínimo. Na capa, onde o título parte da
      // escala maior e é a peça inteira, o véu fecha mais.
      return { ...base, type: 'shape', shape: 'rect', text: '', fill: '#000000', op: cover ? 0.62 : 0.55, radius: 0 };
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
          // Na capa o título parte da escala maior e encolhe até caber; nas
          // demais peças ele divide espaço com o resto e parte do tamanho comum.
          fontSize: cover ? scale.cover : scale.title, boxWidth: rect.w, boxHeight: rect.h,
          lineHeight: component.defaults.lh, weight: style.titleWeight,
          letterSpacing: style.letterSpacing.title, floor: Math.round(scale.body * 1.6)
        }),
        font: style.fonts.title, weight: style.titleWeight,
        ls: style.letterSpacing.title, color: ink.color, fill: 'transparent',
        // Sombra em texto serve para descolar a letra da FOTO. Sobre fundo
        // chapado ela vira borrão — o render do estilo tecnologia mostrou isso
        // no título. O subtítulo já seguia esta regra; o título ficou para trás.
        // A sombra do estilo continua onde faz sentido: selo e botão.
        ...(ink.overImage ? shadowOverImage() : {})
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
        // `ink`, não `palette.ink`: o bloco é pintado com `surface`, então a
        // tinta tem de ser a de cima do painel.
        font: style.fonts.body, color: ink.color,
        bgMode: 'none', fill: 'transparent', radius: 0
      };
    case 'lista':
      return {
        ...base, type: 'text',
        // O número entra no texto da camada: continua editável e some junto se o
        // usuário apagar o item. O marcador que veio escrito sai antes — senão
        // o slot soma o seu número em cima e a peça mostra "1. • item".
        text: `${(index ?? 0) + 1}. ${stripLeadingMarker(text)}`,
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

  // Retângulos dos painéis da estrutura, para saber qual texto cai em cima de
  // qual fundo. Precisa vir ANTES do laço: a tinta do título depende de um slot
  // que só seria visitado depois se fosse decidido na hora.
  const panelRects = (structure?.slots || [])
    .filter((slot) => slot.component === 'painel')
    .map((slot) => rectFor(slot, { canvas, insets }));

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
      // Todo slot de foto PREENCHE a moldura. Antes só o slot sangrado usava
      // `cover`: os demais ficavam em `contain` porque o excedente vazava por
      // cima do texto vizinho — a superfície não tinha recorte. Agora tem
      // (`surface.bgClip`), e a foto pode ocupar o quadro que a estrutura
      // reservou, que é o que separa uma peça editorial de um card com tarja.
      surface.bg = fitMediaToRect(media, rect, 'cover');
      surface.bgClip = slot.bleed && rect.w >= cw && rect.h >= ch ? null : rect;
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
    // Componentes PANELLED ganham um painel de `surface` desenhado pelo próprio
    // build — o texto deles cai na mesma situação do painel da estrutura.
    const onSurface = !onPanel && (PANELLED.has(component.id) || coveredByPanel(slotRect, panelRects));
    const ink = {
      ...inkFor({ palette, overImage: overImage && !onPanel, onPanel, onSurface }),
      overImage: overImage && !onPanel
    };

    let rect = slotRect;
    // `slot.panel` deixa a ESTRUTURA pedir o bloco de cor, e não só o
    // componente. É o que separa uma lista de texto corrido de uma lista
    // visual: o mesmo componente `lista`, cada item dentro do próprio cartão.
    if (PANELLED.has(component.id) || slot.panel) {
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
      ...layerForSlot({
        slot, component, rect, text, style, palette, scale, ink, index: slot.index,
        cover: Boolean(structure?.cover)
      }),
      // Ajuste da estrutura tem a última palavra: o mesmo componente muda de
      // papel conforme onde é usado — o destaque é o "VS" centralizado no
      // comparativo e um rótulo à esquerda no texto-destaque. Aplicado por
      // último de propósito; dentro de `base` o próprio componente sobrescreve.
      ...(slot.overrides || {})
    });
    index += 1;
  }

  // O fundo entra por último no código e primeiro na pilha: camadas renderizam
  // na ordem do array, então o fundo precisa ficar atrás de tudo.
  // O fundo é desenhado ao redor do que a foto REALMENTE ocupa — com moldura,
  // isso é o recorte, não a caixa da mídia, que agora transborda de propósito.
  const mediaRect = media && surface.bg?.w ? (surface.bgClip || surface.bg) : null;
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
