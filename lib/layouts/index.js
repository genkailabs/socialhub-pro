// Orquestrador do §3: conteúdo → tipo → estrutura → componentes → estilo →
// Brand Kit → imagem → peça validada → Composer. Puro, sem I/O.
//
// Fica separado do build e do validate porque é aqui que a ordem do PRD vira
// código: quem chama (server action, painel do Composer, teste) só precisa do
// conteúdo e do contexto da marca.

import { canvasSize } from '@/lib/composer-editor';
import { selectLayoutPlan, classifyContent } from '@/lib/layouts/select';
import { normalizeLayoutContent, eyebrowForType } from '@/lib/layouts/content';
import { buildLayoutSurface } from '@/lib/layouts/build';
import { validateAndFix, validateSlideConsistency } from '@/lib/layouts/validate';
import { MAX_BULLET_SLIDES } from '@/lib/layouts/bullets-hint';
import { mascotMessages } from '@/lib/layouts/mascot';
import { structureById } from '@/lib/layouts/structures';
import { styleById } from '@/lib/layouts/styles';

// Proporção padrão por formato do Composer.
const DEFAULT_RATIO = { post: '1:1', carrossel: '1:1', story: '9:16', reel: '9:16' };

// Tamanho real do arquivo, usado só para decidir "quadrado ou alto". O canvas de
// edição é uma redução da mesma proporção (lib/composer-editor.js).
function outputSize(format, ratio) {
  const [w, h] = canvasSize(format, ratio);
  return { width: w, height: h };
}

/**
 * Monta uma peça completa.
 *
 * @param {object} params
 * @param {object} params.content   { title, subtitle, eyebrow, bullets, cta, brand, quote, stat, ... }
 * @param {object} params.brand     { name, niche, tone, visualStyle, objective, styleId }
 * @param {object} params.kit       Brand Kit (kit.palette).
 * @param {object} params.media     Mídia já hospedada, no formato do Composer.
 * @param {string[]} params.recentStructures ids recentes, do mais novo ao mais antigo.
 */
export function composeSmartPost({
  content = {}, brand = {}, kit = null, format = 'post', ratio = null,
  media = null, recentStructures = [], recentStyles = [], seed = 0,
  structureId = null, styleId = null
} = {}) {
  const usedRatio = ratio || DEFAULT_RATIO[format] || '1:1';
  const canvas = canvasSize(format, usedRatio);
  const size = outputSize(format, usedRatio);

  const normalized = normalizeLayoutContent(content, { brand: content.brand || brand.handle || brand.name || '' });
  const contentType = classifyContent(normalized);
  // O selo só ganha rótulo depois da classificação: escrever "Notícia" numa peça
  // educativa é pior que não ter selo nenhum.
  const enriched = {
    ...normalized,
    contentType,
    eyebrow: normalized.eyebrow || eyebrowForType(contentType),
    hasImage: Boolean(media)
  };

  const plan = selectLayoutPlan({
    content: enriched, brand, format, size, recentStructures, recentStyles, seed
  });
  // Escolha manual do usuário vence a automática — o §12 automatiza a decisão,
  // não a confisca.
  const structure = structureById(structureId) || plan.structure;
  const style = styleById(styleId) || plan.style;

  const built = buildLayoutSurface({
    structure, style, content: enriched, kit,
    brandColor: brand.color || '', niche: brand.niche || '',
    canvas, media
  });

  const checked = validateAndFix({
    surface: built.surface,
    canvas,
    insets: built.insets,
    palette: built.palette,
    requireCta: Boolean(structure.uses?.cta && String(enriched.cta || '').trim())
  });

  return {
    plan: { ...plan, structure, style },
    canvas,
    ratio: usedRatio,
    surface: checked.surface,
    palette: built.palette,
    scale: built.scale,
    insets: built.insets,
    ok: checked.ok,
    issues: checked.issues,
    applied: checked.applied,
    skipped: built.skipped,
    mascot: mascotMessages({
      contentType: plan.contentType,
      structure,
      style,
      palette: built.palette,
      applied: checked.applied,
      issues: checked.issues,
      skipped: built.skipped,
      repeatedStructure: plan.repeatedStructure,
      repeatedStyle: plan.repeatedStyle,
      brandName: brand.name || ''
    })
  };
}

/**
 * Carrossel: capa + miolo. A capa usa a estrutura de capa; os slides seguintes
 * recebem uma dica cada, com a MESMA estrutura entre si — é o que o §14 cobra
 * como consistência entre slides.
 */
export function composeSmartCarousel({
  content = {}, brand = {}, kit = null, ratio = '1:1', media = null,
  recentStructures = [], recentStyles = [], seed = 0
} = {}) {
  const bullets = (Array.isArray(content.bullets) ? content.bullets : []).filter(Boolean);
  const cover = composeSmartPost({
    content: { ...content, bullets },
    brand, kit, format: 'carrossel', ratio, media, recentStructures, recentStyles, seed,
    structureId: 'capa-carrossel'
  });

  const slides = [cover];
  // O teto vem do limite do Instagram menos a capa. Era um 9 solto aqui e
  // outro no aviso do painel: dois números que precisavam concordar por sorte.
  bullets.slice(0, MAX_BULLET_SLIDES).forEach((bullet, index) => {
    slides.push(composeSmartPost({
      content: {
        title: bullet,
        subtitle: '',
        eyebrow: `DICA ${index + 1}`,
        bullets: [],
        cta: index === bullets.length - 1 ? content.cta : '',
        brand: content.brand,
        slideNumber: `${index + 2}/${bullets.length + 1}`,
        contentType: content.contentType
      },
      brand, kit, format: 'carrossel', ratio,
      recentStructures, recentStyles, seed: index + 1,
      structureId: 'manchete',
      styleId: cover.plan.style.id
    }));
  });

  const consistency = validateSlideConsistency(slides.map((slide) => ({ structureId: slide.plan.structure.id })));

  return {
    slides,
    ok: slides.every((slide) => slide.ok) && consistency.ok,
    issues: [...slides.flatMap((slide) => slide.issues), ...consistency.issues],
    mascot: [
      ...cover.mascot,
      slides.length > 1 ? `Montei ${slides.length} slides mantendo a mesma cara entre eles.` : null
    ].filter(Boolean)
  };
}

export { STRUCTURES, structureById, structureIds } from '@/lib/layouts/structures';
export { VISUAL_STYLES, styleById, styleIds } from '@/lib/layouts/styles';
export { COMPONENTS, componentById, componentIds } from '@/lib/layouts/components';
export { layoutTemplateFromSurface, applyLayoutTemplate, describeTemplate } from '@/lib/layouts/templates';
