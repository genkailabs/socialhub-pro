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
import { superficieParaRevisao } from '@/lib/layouts/revisao';
import { structureById } from '@/lib/layouts/structures';
import { styleById } from '@/lib/layouts/styles';
import { revisarCarrossel, revisarSlide } from '@/lib/layout-review';

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
  structureId = null, styleId = null, objectiveFavors = []
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
    content: enriched, brand, format, size, recentStructures, recentStyles, seed, objectiveFavors
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

  // Revisão de diagramação (PRD da revisão, §3 etapa 2): roda DEPOIS do
  // validar-e-corrigir, sobre a superfície já consertada. Rodar antes acusaria
  // defeito que o próprio motor ia resolver na linha de cima.
  //
  // Ela não bloqueia nem altera a peça — só descreve. Quem monta continua
  // entregando o que montou; a nota e a lista sobem junto para quem decide
  // publicar. Reprovar automaticamente uma arte porque a manchete tem uma
  // viúva seria trocar um defeito de acabamento por uma peça que não sai.
  const revisao = revisarSlide(superficieParaRevisao(checked.surface, canvas));

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
    revisao,
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

// Rotação das estruturas dos slides de item. Um carrossel em que todo slide é
// uma `manchete` lê como sete peças soltas coladas — era exatamente o que o
// motor produzia. A variação é o ritmo pedido no §9: cada item chega com um
// peso visual diferente do anterior.
// Só entram estruturas que se sustentam com TÍTULO E DESTAQUE, porque é isso
// que um item de lista tem — não há texto de apoio por item. `slide-explicacao`
// e `texto-destaque` sozinhas deixavam metade do quadro vazia no PNG: os slots
// de apoio sumiam e nada ocupava o lugar.
const ITEM_STRUCTURES = ['manchete', 'slide-conclusao', 'texto-destaque'];

// Overview antes do detalhe só compensa quando há item demais para o olho
// segurar. Abaixo disso a lista repete o que os próprios slides vão mostrar.
const OVERVIEW_FROM = 5;

/**
 * Roteiro do carrossel (§9): capa → contexto → lista → itens → prova → fecho.
 *
 * Cada papel só entra quando o conteúdo o sustenta. Um slide de prova sem foto
 * ou um fecho sem chamada seriam moldura vazia — pior que a sequência curta.
 *
 * @returns {Array<{role: string, structureId: string, content: object}>}
 */
/**
 * Primeira frase do parágrafo e o que sobra dela.
 *
 * O slide de contexto precisa de título: sem ele o slot some e sobra um buraco
 * no topo, que foi o que o PNG mostrou. Promover a primeira frase a título é
 * determinístico e não inventa texto — é o mesmo parágrafo, com hierarquia.
 */
export function splitLead(text = '') {
  const clean = String(text || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { lead: '', rest: '' };
  const frase = clean.match(/^(.{20,110}?[.!?])\s+(.*)$/);
  if (frase) return { lead: frase[1].replace(/[.]$/, ''), rest: frase[2] };
  // Parágrafo de uma frase só é o caso comum — promover ele inteiro a título
  // dava três linhas e reticências, que foi o que o PNG mostrou. A vírgula é o
  // corte seguinte: separa a afirmação do desdobramento sem partir palavra.
  const pausa = clean.match(/^(.{20,90}?)[,;]\s+(.+)$/);
  if (pausa) return { lead: pausa[1], rest: pausa[2].charAt(0).toUpperCase() + pausa[2].slice(1) };
  return { lead: clean.length <= 90 ? clean : '', rest: clean.length <= 90 ? '' : clean };
}

export function carouselScript({ content = {}, bullets = [], hasMedia = false } = {}) {
  const subtitle = String(content.subtitle || '').trim();
  const cta = String(content.cta || '').trim();
  const { lead, rest } = splitLead(subtitle);
  const script = [];

  script.push({ role: 'capa', structureId: 'capa-carrossel', content: { ...content, bullets } });

  if (subtitle) {
    // O título da capa NÃO se repete aqui: quem abre o contexto é a primeira
    // frase do próprio parágrafo, promovida a título.
    script.push({
      role: 'contexto',
      structureId: 'slide-explicacao',
      content: { title: lead, subtitle: rest, eyebrow: 'CONTEXTO', highlight: content.highlight }
    });
  }

  const itens = bullets.slice(0, MAX_BULLET_SLIDES);
  if (itens.length >= OVERVIEW_FROM) {
    script.push({
      role: 'lista',
      structureId: 'lista-visual',
      content: { title: content.title, bullets: itens, eyebrow: 'RESUMO' }
    });
  }

  itens.forEach((bullet, index) => {
    script.push({
      role: 'item',
      structureId: ITEM_STRUCTURES[index % ITEM_STRUCTURES.length],
      // `highlight` fica em branco: `normalizeLayoutContent` deriva do próprio
      // item, então cada slide destaca a palavra que importa nele.
      content: { title: bullet, subtitle: '', eyebrow: `DICA ${index + 1}`, bullets: [] }
    });
  });

  // A prova precisa de uma leitura PRÓPRIA. Reaproveitar o parágrafo do slide
  // de contexto fazia dois slides dizerem a mesma coisa com composições
  // diferentes — variação de forma, não de conteúdo. A leitura aqui é o último
  // item, que é o fecho concreto da lista.
  const legendaDaProva = itens[itens.length - 1] || rest;
  if (hasMedia && legendaDaProva) {
    script.push({
      role: 'prova',
      structureId: 'slide-prova',
      content: { title: content.title, subtitle: legendaDaProva, eyebrow: 'NA PRÁTICA' }
    });
  }

  // Fecho: com chamada, o slide de CTA; sem ela, a conclusão. Repetir o título
  // da capa aqui é deliberado — é o resumo que a pessoa leva do carrossel.
  script.push(cta
    ? { role: 'cta', structureId: 'slide-cta', content: { title: content.title, cta, eyebrow: 'AGORA' } }
    : { role: 'conclusao', structureId: 'slide-conclusao', content: { title: content.title, subtitle: '', eyebrow: 'RESUMINDO', highlight: content.highlight } });

  // O limite do Instagram vale para o roteiro inteiro, não só para os itens.
  return script.slice(0, MAX_BULLET_SLIDES + 1);
}

/**
 * Carrossel: capa + miolo com ritmo. A capa usa a estrutura de capa; os slides
 * seguintes seguem o roteiro do §9, e o ESTILO é o mesmo em todos — é a
 * consistência que o §14 cobra, que vive no estilo e não na estrutura.
 */
export function composeSmartCarousel({
  content = {}, brand = {}, kit = null, ratio = '1:1', media = null,
  recentStructures = [], recentStyles = [], seed = 0, styleId = null, objectiveFavors = []
} = {}) {
  const bullets = (Array.isArray(content.bullets) ? content.bullets : []).filter(Boolean);
  const script = carouselScript({ content, bullets, hasMedia: Boolean(media) });

  function slideFor(step, index, forcedStyleId) {
    return composeSmartPost({
      content: {
        brand: content.brand,
        contentType: content.contentType,
        ...step.content,
        // A moldura numerada é o que faz os slides parecerem uma coleção.
        slideNumber: index === 0 ? '' : `${index + 1}/${script.length}`
      },
      brand, kit, format: 'carrossel', ratio,
      // Só a capa e o slide de prova recebem a foto: repeti-la em todo slide
      // transforma variação de composição em variação nenhuma.
      media: index === 0 || step.role === 'prova' ? media : null,
      recentStructures, recentStyles, seed: seed + index,
      structureId: step.structureId, styleId: forcedStyleId, objectiveFavors
    });
  }

  // A capa escolhe o estilo (respeitando o que a pessoa fixou) e o miolo inteiro
  // herda essa escolha: a consistência do carrossel vive no estilo, não na
  // estrutura repetida.
  const cover = slideFor(script[0], 0, styleId);
  const coverStyleId = cover.plan.style.id;
  const slides = [cover, ...script.slice(1).map((step, position) => slideFor(step, position + 1, coverStyleId))];

  const consistency = validateSlideConsistency(slides.map((slide) => ({
    structureId: slide.plan.structure.id,
    styleId: slide.plan.style.id
  })));

  // A revisão do conjunto vê o que nenhum slide sozinho vê: margem que dança,
  // manchete que muda de corpo, entrelinha inconstante. Cada slide sozinho
  // parece bem, e o carrossel inteiro parece montado por três pessoas — é o
  // defeito de consistência mais comum e o menos percebido.
  const revisao = revisarCarrossel(
    slides.map((slide) => superficieParaRevisao(slide.surface, slide.canvas))
  );

  return {
    slides,
    ok: slides.every((slide) => slide.ok) && consistency.ok,
    issues: [...slides.flatMap((slide) => slide.issues), ...consistency.issues],
    revisao,
    mascot: [
      ...cover.mascot,
      slides.length > 1
        ? `Montei ${slides.length} slides com ritmo: ${script.map((step) => step.role).join(' → ')}.`
        : null
    ].filter(Boolean),
    // A nota é do carrossel, não de um slide: quem publica decide pela peça
    // inteira. Fica fora de `mascot` porque não é conversa, é medida.
    notaDiagramacao: revisao.nota
  };
}

export { STRUCTURES, structureById, structureIds } from '@/lib/layouts/structures';
export { VISUAL_STYLES, styleById, styleIds } from '@/lib/layouts/styles';
export { COMPONENTS, componentById, componentIds } from '@/lib/layouts/components';
export { layoutTemplateFromSurface, applyLayoutTemplate, describeTemplate } from '@/lib/layouts/templates';
