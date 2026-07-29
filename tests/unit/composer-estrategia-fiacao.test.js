import { beforeEach, describe, expect, it, vi } from 'vitest';

// A Estratégia do Composer escrevia estado que ninguém lia. Objetivo e tipo de
// peça mudavam a tela e não mudavam a arte; e o caminho com IA descartava a
// estrutura e o estilo que a pessoa tinha escolhido, sem avisar.
//
// Estes testes prendem a fiação: cada controle precisa chegar ao motor.

const state = vi.hoisted(() => ({ composePost: [], composeCarousel: [], generated: null }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table) => ({
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: [], error: null }),
          maybeSingle: async () => (table === 'brands'
            ? { data: { id: 'b1', name: 'Marca', color: '#000' }, error: null }
            : { data: null, error: null })
        };
        return chain;
      },
      insert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
    })
  })
}));

vi.mock('@/lib/brand-kit-data', () => ({ getBrandKit: async () => ({ niche: 'psicologia', tone: 'acolhedor' }) }));
vi.mock('@/lib/layouts-data', () => ({
  getRecentLayoutUsage: async () => ({ recentStructures: [], recentStyles: [] }),
  listLayoutTemplates: async () => []
}));
vi.mock('@/lib/ai-actions', () => ({
  generatePost: vi.fn(async () => state.generated)
}));

// Espiona o motor sem substituí-lo: o que interessa é o que chega nele.
vi.mock('@/lib/layouts/index', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    composeSmartPost: (args) => { state.composePost.push(args); return real.composeSmartPost(args); },
    composeSmartCarousel: (args) => { state.composeCarousel.push(args); return real.composeSmartCarousel(args); }
  };
});

import { buildLayoutForContent, generateLayoutFromBrief } from '@/lib/layout-actions';

const conteudo = { title: 'Um título', subtitle: '', bullets: [], cta: '', brand: 'marca', caption: '' };

beforeEach(() => {
  state.composePost = [];
  state.composeCarousel = [];
  state.generated = {
    ok: true,
    spec: { imageTitle: 'Título da IA', subtext: 'Apoio', bullets: [], cta: '', caption: '', hashtags: [] },
    cost: 0
  };
});

describe('objetivo chega ao motor como categorias favorecidas (§4)', () => {
  it('traduz o id do objetivo nas categorias que ele favorece', async () => {
    await buildLayoutForContent({ brandId: 'b1', content: conteudo, objective: 'noticia' });
    expect(state.composePost[0].objectiveFavors).toEqual(['noticia']);
  });

  it('sem objetivo não inclina nada — a escolha fica com o conteúdo', async () => {
    await buildLayoutForContent({ brandId: 'b1', content: conteudo });
    expect(state.composePost[0].objectiveFavors).toEqual([]);
  });

  it('objetivo inexistente não quebra nem inventa categoria', async () => {
    await buildLayoutForContent({ brandId: 'b1', content: conteudo, objective: 'nao-existe' });
    expect(state.composePost[0].objectiveFavors).toEqual([]);
  });
});

describe('estrutura e estilo sobrevivem ao caminho com IA', () => {
  // O bug: generateLayoutFromBrief montava a peça sem repassar as escolhas, e a
  // arte voltava com outro estilo sem nenhum aviso na tela.
  it('repassa estrutura e estilo escolhidos para a montagem', async () => {
    const out = await generateLayoutFromBrief({
      brandId: 'b1', brandName: 'Marca', brief: { topic: 'tema' },
      structureId: 'manchete', styleId: 'editorial'
    });

    expect(out.slides[0].structureId).toBe('manchete');
    expect(out.slides[0].styleId).toBe('editorial');
  });

  it('leva o objetivo junto, como no caminho sem IA', async () => {
    await generateLayoutFromBrief({
      brandId: 'b1', brandName: 'Marca', brief: { topic: 'tema' }, objective: 'noticia'
    });
    expect(state.composePost[0].objectiveFavors).toEqual(['noticia']);
  });

  it('sem escolha manual, o motor decide — o comportamento de antes', async () => {
    const out = await generateLayoutFromBrief({
      brandId: 'b1', brandName: 'Marca', brief: { topic: 'tema' }
    });
    expect(out.slides[0].structureId).toBeTruthy();
  });
});

describe('carrossel: capa fixa, estilo da pessoa', () => {
  it('mantém a estrutura de capa e respeita o estilo escolhido', async () => {
    const out = await buildLayoutForContent({
      brandId: 'b1', format: 'carrossel', styleId: 'editorial',
      content: { ...conteudo, bullets: ['um', 'dois'] }
    });

    expect(out.slides[0].structureId).toBe('capa-carrossel');
    expect(out.slides[0].styleId).toBe('editorial');
  });
});
