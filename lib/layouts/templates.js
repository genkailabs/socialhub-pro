// "Salvar como layout" (PRD §11) e reaproveitamento do template. Puro, sem I/O.
//
// O que se guarda é a PEÇA sem o conteúdo: posições, estilos, decoração e quais
// elementos são dinâmicos. Guardar o texto junto transformaria o template numa
// cópia do post — e o §11 é explícito em separar elementos fixos de dinâmicos.

import { makeSurface } from '@/lib/composer-editor';
import { componentById, componentText } from '@/lib/layouts/components';

export const TEMPLATE_VERSION = 1;

// Campos da camada que o template guarda. Lista fechada de propósito: copiar a
// camada inteira arrastaria estado de edição (seleção, histórico) para dentro
// do template.
const LAYER_KEYS = [
  'type', 'shape', 'text', 'x', 'y', 'w', 'h', 'fs', 'weight', 'italic', 'align',
  'color', 'fill', 'font', 'rot', 'op', 'radius', 'ls', 'lh', 'tt',
  'bgMode', 'bgFill', 'bgRadius', 'strokeW', 'strokeColor',
  'shOn', 'shX', 'shY', 'shB', 'shColor', 'dash', 'cap', 'heads', 'curve', 'icon'
];

function pickLayer(layer) {
  const picked = {};
  for (const key of LAYER_KEYS) {
    if (layer[key] !== undefined) picked[key] = layer[key];
  }
  return picked;
}

/**
 * Transforma a superfície aberta no Composer num template reutilizável.
 *
 * @param {object} surface        Superfície atual.
 * @param {object} options
 * @param {number[]} options.canvas  [largura, altura] em que a peça foi montada.
 * @param {object} options.roles     { [layerId]: componentId } marcado pelo usuário.
 *                                   Sem marcação, vale o `componentId` que o
 *                                   gerador já gravou; sem os dois, é fixo.
 */
export function layoutTemplateFromSurface(surface, {
  canvas = [430, 430], name = 'Layout sem nome', format = 'post', ratio = '1:1',
  structureId = null, styleId = null, roles = {}
} = {}) {
  const elements = (surface?.layers || []).map((layer) => {
    const componentId = roles[layer.id] !== undefined ? roles[layer.id] : layer.componentId || null;
    const component = componentById(componentId);
    const dynamic = Boolean(component && component.behavior === 'dynamic');
    return {
      id: layer.id,
      componentId: componentId || null,
      behavior: dynamic ? 'dynamic' : 'fixed',
      // O texto do elemento dinâmico vira exemplo, não conteúdo: é o que aparece
      // na miniatura quando ninguém preencheu o campo ainda.
      sample: dynamic ? String(layer.text || '') : '',
      layer: pickLayer(layer)
    };
  });

  return {
    version: TEMPLATE_VERSION,
    name: String(name || 'Layout sem nome').trim().slice(0, 80),
    format,
    ratio,
    canvas: [canvas[0], canvas[1]],
    structureId,
    styleId,
    // A mídia é sempre dinâmica: o template guarda só o enquadramento.
    media: surface?.media ? { bg: { ...surface.bg } } : null,
    elements
  };
}

export function templateDynamicElements(template) {
  return (template?.elements || []).filter((element) => element.behavior === 'dynamic');
}

export function templateFixedElements(template) {
  return (template?.elements || []).filter((element) => element.behavior === 'fixed');
}

function scaleLayer(layer, factorX, factorY) {
  const scaled = { ...layer };
  scaled.x = Math.round(layer.x * factorX);
  scaled.y = Math.round(layer.y * factorY);
  scaled.w = Math.round(layer.w * factorX);
  scaled.h = Math.round(layer.h * factorY);
  // O corpo acompanha o menor dos dois fatores: acompanhar só a largura fazia o
  // texto crescer no Story e estourar a altura da caixa.
  if (layer.fs) scaled.fs = Math.max(8, Math.round(layer.fs * Math.min(factorX, factorY)));
  return scaled;
}

/**
 * Aplica o template a um conteúdo novo, devolvendo uma superfície do Composer.
 * Elemento dinâmico sem conteúdo correspondente é descartado — manter a caixa
 * vazia era o defeito que o §14 chama de "elemento sobreposto sem sentido".
 */
export function applyLayoutTemplate(template, { content = {}, canvas = null, media = null } = {}) {
  const from = template?.canvas || [430, 430];
  const to = canvas || from;
  const factorX = to[0] / from[0];
  const factorY = to[1] / from[1];

  const surface = makeSurface(media || null);
  if (media && template?.media?.bg) {
    surface.bg = {
      ...template.media.bg,
      x: Math.round(template.media.bg.x * factorX),
      y: Math.round(template.media.bg.y * factorY),
      w: Math.round(template.media.bg.w * factorX),
      h: Math.round(template.media.bg.h * factorY)
    };
  }

  for (const element of template?.elements || []) {
    const layer = scaleLayer(element.layer, factorX, factorY);
    if (element.behavior === 'dynamic') {
      const component = componentById(element.componentId);
      const text = component ? componentText(component, content) : '';
      if (component?.layerType === 'media') continue;
      if (component?.field && !text) continue;
      layer.text = component?.id === 'logo' && text && !text.startsWith('@') ? `@${text}` : (text || layer.text);
    }
    surface.layers.push({ ...layer, id: element.id, componentId: element.componentId || null, hidden: false, locked: false });
  }

  return surface;
}

// Resumo curto para a lista de layouts salvos.
export function describeTemplate(template) {
  const dynamic = templateDynamicElements(template).length;
  const fixed = templateFixedElements(template).length;
  return `${dynamic} ${dynamic === 1 ? 'elemento dinâmico' : 'elementos dinâmicos'} · ${fixed} ${fixed === 1 ? 'fixo' : 'fixos'}`;
}
