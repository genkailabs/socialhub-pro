// Fiação do motor do Composer: os quatro defeitos que faziam toda peça sair
// igual. Cada bloco aqui existe porque o defeito passou despercebido — o
// caminho tinha teste de unidade em cada ponta e nenhum teste da ligação.

import { describe, it, expect } from 'vitest';
import { resolveHighlight, normalizeLayoutContent } from '@/lib/layouts/content';
import { normalizeSpec } from '@/lib/ai/spec';
import {
  shapeOf, isTallShape, structureById, eligibleStructures, structureFits
} from '@/lib/layouts/structures';
import { styleInsets, styleById } from '@/lib/layouts/styles';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { fieldsForPieceType, structuresForPieceType } from '@/lib/composer-strategy';
import { manualStructures, structuresFor } from '@/components/composer/LayoutsPanel';
import { componentById, componentText } from '@/lib/layouts/components';
import { buildLayoutSurface } from '@/lib/layouts/build';
import { carouselScript, splitLead, composeSmartCarousel } from '@/lib/layouts/index';
import { mediaTransformStyle } from '@/lib/composer-editor';
import { contrastRatio } from '@/lib/ai/art/quality';

describe('destaque (§1.2)', () => {
  it('aceita o recorte do título que a IA propôs', () => {
    expect(resolveHighlight('futuro', 'O futuro do marketing')).toBe('futuro');
    expect(resolveHighlight('do marketing', 'O futuro do marketing')).toBe('do marketing');
  });

  it('recusa o que não está no título e deriva dele', () => {
    // A palavra pintada precisa existir na peça; senão vira bloco de cor solto.
    expect(resolveHighlight('inovação', 'O futuro do marketing')).toBe('marketing');
  });

  it('recusa o título inteiro: destaque de tudo é destaque de nada', () => {
    expect(resolveHighlight('O futuro do marketing', 'O futuro do marketing')).toBe('marketing');
  });

  it('nunca destaca artigo ou preposição', () => {
    expect(resolveHighlight('', 'Como usar o novo painel')).toBe('painel');
    expect(resolveHighlight('', 'De um jeito ou de outro')).not.toMatch(/^(de|ou|um)$/i);
  });

  it('sem título não inventa destaque', () => {
    expect(resolveHighlight('', '')).toBe('');
  });

  it('o prompt pede a palavra e a spec devolve preenchida', () => {
    const { system } = buildContentPrompt({ brandKit: {}, brief: { topic: 'x' } });
    expect(system).toContain('highlight');

    const spec = normalizeSpec({ headline: 'A reforma tributária muda tudo', highlight: 'reforma' });
    expect(spec.highlight).toBe('reforma');
  });

  it('a spec ancora o destaque no título que vai para a arte', () => {
    // `imageTitle` é o texto que aparece na peça — é nele que a palavra tem
    // de existir, não no headline da legenda.
    const spec = normalizeSpec({
      headline: 'Um texto longo para a legenda',
      image_title: 'Reforma aprovada',
      image_text: true,
      highlight: 'legenda'
    });
    expect(spec.imageTitle).toBe('Reforma aprovada');
    expect(['Reforma', 'aprovada']).toContain(spec.highlight);
  });

  it('conteúdo manual sem destaque também ganha hierarquia', () => {
    const content = normalizeLayoutContent({ title: 'O erro que custa caro' });
    expect(content.highlight).toBeTruthy();
    // E com isso as estruturas editoriais que exigem o campo voltam a ser
    // elegíveis, em vez de sobrar sempre a manchete.
    expect(structureFits(structureById('trend-alert'), content, 'square')).toBe(true);
  });
});

describe('formato 4:5 (§1.5)', () => {
  it('separa quadrado, retrato, story e paisagem', () => {
    expect(shapeOf({ width: 1080, height: 1080 })).toBe('square');
    expect(shapeOf({ width: 1080, height: 1350 })).toBe('portrait');
    expect(shapeOf({ width: 1080, height: 1440 })).toBe('portrait');
    expect(shapeOf({ width: 1080, height: 1920 })).toBe('story');
    expect(shapeOf({ width: 1080, height: 566 })).toBe('wide');
  });

  it('só o Story tem interface do app por cima', () => {
    expect(isTallShape('story')).toBe(true);
    expect(isTallShape('portrait')).toBe(false);
  });

  it('4:5 não recebe a margem de segurança do Story', () => {
    const style = styleById('editorial');
    const retrato = styleInsets(style, { width: 384, height: 480 });
    const story = styleInsets(style, { width: 270, height: 480 });
    // No 4:5 a margem vertical é a mesma da horizontal: não há barra do app
    // cobrindo o topo nem o rodapé de um post de feed.
    expect(retrato.top).toBe(retrato.x);
    expect(story.top).toBeGreaterThan(story.x);
  });

  it('o catálogo de 4:5 não é o catálogo de Story', () => {
    const conteudo = { title: 'Teste', subtitle: 'Apoio', hasImage: true, bullets: [] };
    const retrato = eligibleStructures(conteudo, 'portrait').map((s) => s.id);
    expect(retrato).toContain('hero-editorial');
    expect(retrato.length).toBeGreaterThan(5);
  });

  it('a lista manual segue a proporção aberta, não só o formato', () => {
    const quadrado = manualStructures('post', '1:1').map((s) => s.id);
    const paisagem = manualStructures('post', '1.91:1').map((s) => s.id);
    // 1.91:1 tem 566px de altura: quase nada da pilha vertical cabe.
    expect(paisagem.length).toBeLessThan(quadrado.length);
    expect(paisagem).toContain('manchete');
    expect(paisagem).not.toContain('lista');
  });
});

describe('foto preenche a moldura (§6)', () => {
  it('slot de foto que não sangra ganha recorte e transborda por baixo dele', () => {
    const built = buildLayoutSurface({
      structure: structureById('noticia-premium'), style: styleById('jornalistico'),
      content: { title: 'Titulo', subtitle: 'Apoio', hasImage: true },
      canvas: [430, 430],
      // Foto 16:9 num slot mais alto que largo: em `contain` sobrava tarja.
      media: { url: 'x', kind: 'image', width: 1600, height: 900 }
    });
    expect(built.surface.bgClip).toBeTruthy();
    // Preenche: a caixa da mídia cobre toda a moldura nas duas dimensões.
    expect(built.surface.bg.w).toBeGreaterThanOrEqual(built.surface.bgClip.w - 1);
    expect(built.surface.bg.h).toBeGreaterThanOrEqual(built.surface.bgClip.h - 1);
  });

  it('foto que sangra a peça inteira não precisa de recorte', () => {
    const built = buildLayoutSurface({
      structure: structureById('hero-editorial'), style: styleById('editorial'),
      content: { title: 'Titulo', hasImage: true },
      canvas: [430, 430],
      media: { url: 'x', kind: 'image', width: 1600, height: 900 }
    });
    expect(built.surface.bgClip).toBeNull();
  });

  it('o recorte vira clip-path no canvas', () => {
    const style = mediaTransformStyle(
      { x: -20, y: -30, w: 500, h: 400, scale: 1, rot: 0 },
      { width: 500, height: 400 },
      [430, 430],
      { x: 0, y: 0, w: 430, h: 200 }
    );
    expect(style.clipPath).toBe('inset(30px 50px 170px 20px)');
  });

  it('sem moldura a mídia continua livre no quadro', () => {
    const style = mediaTransformStyle({ x: 0, y: 0, w: 430, h: 430, scale: 1, rot: 0 }, { width: 430, height: 430 }, [430, 430], null);
    expect(style.clipPath).toBeUndefined();
  });
});

describe('ritmo do carrossel (§9)', () => {
  it('a sequência tem papéis diferentes, não sete manchetes', () => {
    const roteiro = carouselScript({
      content: { title: 'Como fechar o mes', subtitle: 'Trava nos mesmos pontos. Todos de rotina.', cta: 'Salve', highlight: 'fechar' },
      bullets: ['Um', 'Dois', 'Tres'],
      hasMedia: true
    });
    const papeis = roteiro.map((step) => step.role);
    expect(papeis[0]).toBe('capa');
    expect(papeis).toContain('contexto');
    expect(papeis).toContain('prova');
    expect(papeis[papeis.length - 1]).toBe('cta');
    // Estruturas alternadas entre os itens: é o ritmo.
    expect(new Set(roteiro.filter((s) => s.role === 'item').map((s) => s.structureId)).size).toBeGreaterThan(1);
  });

  it('papel sem conteúdo que o sustente não entra', () => {
    const roteiro = carouselScript({ content: { title: 'So titulo' }, bullets: [], hasMedia: false });
    expect(roteiro.map((s) => s.role)).not.toContain('prova');
    expect(roteiro.map((s) => s.role)).not.toContain('contexto');
    // Sem CTA o fecho é a conclusão, nunca uma moldura vazia.
    expect(roteiro[roteiro.length - 1].role).toBe('conclusao');
  });

  it('o contexto promove a primeira frase a título em vez de deixar buraco', () => {
    expect(splitLead('O fechamento sempre trava no mesmo ponto. Todos eles sao de rotina.')).toEqual({
      lead: 'O fechamento sempre trava no mesmo ponto', rest: 'Todos eles sao de rotina.'
    });
    // Parágrafo de uma frase só: corta na vírgula, não em três linhas de título.
    const { lead, rest } = splitLead('O fechamento trava sempre nos mesmos quatro pontos, e todos eles sao de rotina.');
    expect(lead).toBe('O fechamento trava sempre nos mesmos quatro pontos');
    expect(rest).toMatch(/^E todos/);
  });

  it('o carrossel inteiro usa um estilo só', () => {
    const carrossel = composeSmartCarousel({
      content: { title: 'Guia rapido', subtitle: 'Um resumo. Do que muda.', bullets: ['A', 'B', 'C'], cta: 'Salve', brand: 'marca' },
      brand: { niche: 'contabilidade' }, kit: { palette: { accent: '#0F766E', bg: '#FFFFFF', ink: '#111111' } },
      ratio: '4:5'
    });
    expect(new Set(carrossel.slides.map((s) => s.plan.style.id)).size).toBe(1);
    expect(new Set(carrossel.slides.map((s) => s.plan.structure.id)).size).toBeGreaterThan(2);
    // 4:5 em todos os slides, não só na capa.
    for (const slide of carrossel.slides) expect(slide.canvas).toEqual([384, 480]);
  });
});

describe('tinta sobre o painel da estrutura', () => {
  it('título sobre painel de tela cheia usa a tinta do painel, não a do fundo', () => {
    const built = buildLayoutSurface({
      structure: structureById('manchete'), style: styleById('jornalistico'),
      content: { title: 'Governo antecipa o calendario' },
      // Fundo claro e painel escuro: era aqui que o título saía cinza-lavado.
      kit: { palette: { accent: '#0F766E', bg: '#FFFFFF', ink: '#111111' } },
      canvas: [430, 430]
    });
    const titulo = built.surface.layers.find((l) => l.componentId === 'titulo');
    const painel = built.surface.layers.filter((l) => l.componentId === 'painel' && !l.id.includes('-fundo-')).pop();
    expect(contrastRatio(titulo.color, painel.fill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('tipo de peça (§1.4)', () => {
  it('notícia pede fonte e data, e não oferece lista genérica', () => {
    const campos = fieldsForPieceType('noticia');
    expect(campos).toEqual(expect.arrayContaining(['title', 'subtitle', 'highlight', 'source', 'date', 'cta']));
    expect(campos).not.toContain('bullets');
  });

  it('notícia só oferece estrutura jornalística', () => {
    const ids = structuresForPieceType('noticia');
    expect(ids).toContain('noticia-premium');
    expect(ids).toContain('manchete');
    expect(ids).not.toContain('lista');
    expect(structuresFor('post', 'noticia', '4:5').map((s) => s.id)).not.toContain('lista');
  });

  it('a fonte vira crédito visível na peça', () => {
    const fonte = componentById('fonte');
    expect(fonte.field).toBe('source');
    expect(componentText(fonte, { source: 'Agência Brasil' })).toBe('Fonte: Agência Brasil');
    // Sem crédito o slot some, como qualquer campo vazio.
    expect(componentText(fonte, { source: '' })).toBe('');
  });

  it('as estruturas de notícia têm onde pôr o crédito', () => {
    for (const id of ['manchete', 'noticia-premium', 'hero-editorial', 'trend-alert']) {
      expect(structureById(id).slots.some((slot) => slot.component === 'fonte')).toBe(true);
    }
  });
});
