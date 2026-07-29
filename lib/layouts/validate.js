// Validação automática da peça (PRD §14) e correção antes de entregar.
// Puro, sem I/O.
//
// A regra do PRD é "renderizar → validar → corrigir → renderizar novamente".
// Este módulo faz o validar e o corrigir sobre as CAMADAS, que é onde o defeito
// existe de verdade — validar depois de virar pixel só diria "está errado", sem
// dizer onde.

import { contrastRatio } from '@/lib/ai/art/quality';
import { ensureReadableInk } from '@/lib/ai/art/palette';
import { componentById, trimToLimit } from '@/lib/layouts/components';
import { estimateLines, textFits } from '@/lib/layouts/build';

export const MIN_CONTRAST_BODY = 4.5;
export const MIN_CONTRAST_TITLE = 3;
// Fração da área do menor elemento que, sobreposta, deixa de ser respiro e vira
// defeito. Encostar um pouco é composição; cobrir um terço é erro.
export const MAX_OVERLAP_RATIO = 0.3;
// Distorção tolerada da imagem. Acima disso o rosto "estica" e aparece no PNG.
export const MAX_ASPECT_DRIFT = 0.02;

const TEXT_TYPES = new Set(['text', 'button', 'sticker']);
const DECORATIVE = new Set(['painel', 'sobreposicao', 'divisor']);

function issue(id, message, fix, extra = {}) {
  return { id, message, fix, ...extra };
}

function rectOf(layer) {
  return { x: layer.x, y: layer.y, w: layer.w, h: layer.h };
}

function intersectionArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// Cor efetivamente atrás de uma camada de texto. Sobre foto o contraste depende
// da foto, que não dá para medir aqui — a sombra do glifo é o que garante a
// leitura, então essa combinação não é reprovada às cegas.
function backgroundUnder(layer, { palette, hasMedia, layers }) {
  if (layer.bgMode === 'box' || layer.bgMode === 'line') return layer.bgFill;
  if (layer.type === 'button') return layer.fill;

  // Vale o painel MAIS ALTO que ainda esteja abaixo do texto. Pegar o primeiro
  // da lista media o contraste contra o fundo da peça mesmo quando há um painel
  // escuro por cima dele — foi assim que um título escuro passou na validação e
  // saiu ilegível sobre o painel da manchete.
  const own = layers.indexOf(layer);
  let panel = null;
  for (let i = 0; i < (own < 0 ? layers.length : own); i++) {
    const other = layers[i];
    if (other.componentId !== 'painel') continue;
    if (intersectionArea(rectOf(layer), rectOf(other)) > rectOf(layer).w * rectOf(layer).h * 0.6) panel = other;
  }
  if (panel) return panel.fill;
  if (hasMedia && layer.shOn) return null;
  if (hasMedia) return '#7F7F7F';
  return palette.bg;
}

/**
 * Roda o checklist do §14 sobre uma peça montada.
 *
 * @param {object} params
 * @param {object} params.surface   Superfície do Composer.
 * @param {number[]} params.canvas  [largura, altura] do canvas.
 * @param {object} params.insets    Margem de segurança do estilo.
 * @param {object} params.palette   Paleta resolvida.
 * @param {boolean} params.requireCta Se a peça exige chamada para ação.
 */
export function validateLayout({ surface, canvas = [430, 430], insets, palette = {}, requireCta = false } = {}) {
  const [cw, ch] = canvas;
  const margin = insets || { x: Math.round(cw * 0.06), top: Math.round(ch * 0.06), bottom: Math.round(ch * 0.06) };
  const layers = surface?.layers || [];
  const issues = [];

  for (const layer of layers) {
    const component = componentById(layer.componentId);

    if (TEXT_TYPES.has(layer.type) && String(layer.text || '').trim()) {
      // 1. Texto cortado
      if (!textFits(layer.text, {
        fontSize: layer.fs, boxWidth: layer.w, boxHeight: layer.h,
        lineHeight: layer.lh || 1.2, weight: layer.weight, letterSpacing: layer.ls
      })) {
        const lines = estimateLines(layer.text, { fontSize: layer.fs, boxWidth: layer.w, weight: layer.weight, letterSpacing: layer.ls });
        issues.push(issue('texto_cortado', `"${component?.label || layer.componentId || 'Texto'}" precisa de ${lines} linhas e a caixa não comporta.`, 'Reduzir o corpo do texto ou encurtar o conteúdo.', { layerId: layer.id }));
      }

      // 2. Excesso de caracteres
      if (component?.limits?.max && String(layer.text).length > component.limits.max + 1) {
        issues.push(issue('excesso_caracteres', `"${component.label}" passou de ${component.limits.max} caracteres.`, 'Encurtar o texto até o limite do componente.', { layerId: layer.id }));
      }

      // 3. Contraste
      const background = backgroundUnder(layer, { palette, hasMedia: Boolean(surface?.media), layers });
      if (background) {
        const ratio = contrastRatio(layer.color, background);
        const minimum = component?.styleRole === 'title' || component?.styleRole === 'number' ? MIN_CONTRAST_TITLE : MIN_CONTRAST_BODY;
        if (ratio !== null && ratio < minimum) {
          issues.push(issue('contraste_baixo', `"${component?.label || 'Texto'}" tem contraste ${ratio.toFixed(2)}:1 sobre o fundo.`, `Ajustar a cor até ${minimum}:1.`, { layerId: layer.id, background, minimum }));
        }
      }
    }

    // 4. Área segura — decoração de sangria pode encostar na borda de propósito.
    if (!DECORATIVE.has(layer.componentId)) {
      const factor = component?.safeMarginFactor || 1;
      const left = margin.x * factor;
      const top = margin.top * factor;
      const bottom = margin.bottom * factor;
      const out = layer.x < left - 1 || layer.y < top - 1
        || layer.x + layer.w > cw - left + 1
        || layer.y + layer.h > ch - bottom + 1;
      if (out) {
        const id = layer.componentId === 'logo' ? 'logo_na_borda' : 'fora_area_segura';
        issues.push(issue(id, `"${component?.label || layer.componentId || 'Elemento'}" está fora da área segura.`, 'Trazer o elemento para dentro da margem.', { layerId: layer.id, margin: { left, top, bottom } }));
      }
    }
  }

  // 5. Elementos sobrepostos — só entre elementos de conteúdo. Painel e véu
  // existem justamente para ficar embaixo dos outros.
  const content = layers.filter((layer) => !DECORATIVE.has(layer.componentId));
  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      const a = rectOf(content[i]);
      const b = rectOf(content[j]);
      const area = intersectionArea(a, b);
      if (!area) continue;
      const smallest = Math.min(a.w * a.h, b.w * b.h);
      if (smallest > 0 && area / smallest > MAX_OVERLAP_RATIO) {
        issues.push(issue('elementos_sobrepostos', `"${componentById(content[i].componentId)?.label || 'Elemento'}" e "${componentById(content[j].componentId)?.label || 'Elemento'}" se sobrepõem.`, 'Afastar um dos elementos.', { layerId: content[j].id, otherId: content[i].id }));
      }
    }
  }

  // 6. Imagem distorcida
  if (surface?.media && surface?.bg) {
    const natural = Number(surface.media.width) / Number(surface.media.height);
    const drawn = Number(surface.bg.w) / Number(surface.bg.h);
    if (Number.isFinite(natural) && Number.isFinite(drawn) && natural > 0 && drawn > 0) {
      if (Math.abs(drawn - natural) / natural > MAX_ASPECT_DRIFT) {
        issues.push(issue('imagem_distorcida', 'A imagem está esticada em relação à proporção original.', 'Reenquadrar mantendo a proporção.'));
      }
    }
  }

  // 7. CTA obrigatório
  if (requireCta && !layers.some((layer) => layer.componentId === 'cta' && String(layer.text || '').trim())) {
    issues.push(issue('cta_ausente', 'A peça exige chamada para ação e nenhuma foi montada.', 'Adicionar um CTA curto.'));
  }

  return { ok: issues.length === 0, issues };
}

/**
 * §14: consistência entre slides do carrossel.
 *
 * A regra antiga era "no máximo duas estruturas no carrossel inteiro", e ela
 * estava medindo a coisa errada. Um carrossel de referência varia MUITO a
 * composição — capa forte, contexto, lista, prova, fecho — e continua lendo
 * como uma peça só. O que sustenta a leitura de sequência é o ESTILO: mesma
 * paleta, mesma tipografia, mesma moldura em todos os slides.
 *
 * Exigir estrutura repetida era o que obrigava o motor a montar sete manchetes
 * iguais para passar na própria validação.
 */
export function validateSlideConsistency(slides = []) {
  const styles = [...new Set(slides.map((slide) => slide?.styleId).filter(Boolean))];
  if (styles.length > 1) {
    return {
      ok: false,
      issues: [issue(
        'slides_inconsistentes',
        `O carrossel mistura ${styles.length} estilos visuais.`,
        'Usar o mesmo estilo em todos os slides; a variação fica na estrutura.'
      )]
    };
  }
  return { ok: true, issues: [] };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Aplica a correção de um problema. Devolve `false` quando não há conserto
 * determinístico — aí o problema sobe para o usuário em vez de sumir.
 */
export function applyLayoutFix({ issue: problem, surface, canvas, palette }) {
  const [cw, ch] = canvas;
  const layer = surface.layers.find((item) => item.id === problem.layerId);

  switch (problem.id) {
    case 'texto_cortado': {
      if (!layer) return false;
      const floor = Math.max(9, Math.round(layer.fs * 0.55));
      let size = layer.fs;
      while (size > floor) {
        size = Math.max(floor, Math.round(size * 0.92));
        if (textFits(layer.text, { fontSize: size, boxWidth: layer.w, boxHeight: layer.h, lineHeight: layer.lh || 1.2, weight: layer.weight, letterSpacing: layer.ls })) break;
      }
      if (size === layer.fs) return false;
      layer.fs = size;
      return true;
    }
    case 'excesso_caracteres': {
      if (!layer) return false;
      const component = componentById(layer.componentId);
      layer.text = trimToLimit(layer.text, component?.limits?.max);
      return true;
    }
    case 'contraste_baixo': {
      if (!layer || !problem.background) return false;
      const next = ensureReadableInk(layer.color, problem.background, problem.minimum || MIN_CONTRAST_BODY);
      if (!next || next === layer.color) return false;
      layer.color = next;
      return true;
    }
    case 'logo_na_borda':
    case 'fora_area_segura': {
      if (!layer || !problem.margin) return false;
      const { left, top, bottom } = problem.margin;
      // Arredonda: o fator de margem do logo (1.4x) produzia x = 39.1999… e o
      // canvas passava a guardar coordenada fracionária sem motivo.
      layer.w = Math.round(Math.min(layer.w, cw - left * 2));
      layer.h = Math.round(Math.min(layer.h, ch - top - bottom));
      layer.x = Math.round(clamp(layer.x, left, cw - left - layer.w));
      layer.y = Math.round(clamp(layer.y, top, ch - bottom - layer.h));
      return true;
    }
    case 'elementos_sobrepostos': {
      const other = surface.layers.find((item) => item.id === problem.otherId);
      if (!layer || !other) return false;
      // Empurra o de baixo para depois do de cima; se não couber, desiste em vez
      // de jogar o elemento para fora do quadro.
      const target = Math.round(other.y + other.h + 6);
      if (target + layer.h > ch) return false;
      layer.y = target;
      return true;
    }
    case 'imagem_distorcida': {
      const natural = Number(surface.media?.width) / Number(surface.media?.height);
      if (!Number.isFinite(natural) || natural <= 0) return false;
      const height = Math.round(surface.bg.w / natural);
      surface.bg = { ...surface.bg, y: Math.round(surface.bg.y + (surface.bg.h - height) / 2), h: height };
      return true;
    }
    default:
      // cta_ausente e slides_inconsistentes não têm conserto honesto aqui:
      // inventar um CTA seria escrever no lugar do usuário.
      return false;
  }
}

export const MAX_VALIDATION_ROUNDS = 3;

/**
 * Ciclo do §14: validar → corrigir → validar de novo.
 * Devolve a superfície corrigida, o que sobrou de problema e o histórico —
 * o mascote (§15) usa o histórico para dizer o que precisou ajustar.
 */
export function validateAndFix({ surface, canvas = [430, 430], insets, palette = {}, requireCta = false } = {}) {
  let result = validateLayout({ surface, canvas, insets, palette, requireCta });
  const applied = [];

  for (let round = 0; round < MAX_VALIDATION_ROUNDS && !result.ok; round++) {
    let changed = false;
    for (const problem of result.issues) {
      if (applyLayoutFix({ issue: problem, surface, canvas, palette })) {
        applied.push(problem.id);
        changed = true;
      }
    }
    if (!changed) break;
    result = validateLayout({ surface, canvas, insets, palette, requireCta });
  }

  return { surface, ok: result.ok, issues: result.issues, applied, rounds: applied.length };
}
