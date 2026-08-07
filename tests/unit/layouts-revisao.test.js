import { describe, expect, it } from 'vitest';
import { composeSmartPost, composeSmartCarousel } from '@/lib/layouts';
import { superficieParaRevisao } from '@/lib/layouts/revisao';

// A revisão de diagramação passa a andar junto da montagem (§3, etapa 2). O que
// estes testes protegem não é a nota — é o contrato: a revisão DESCREVE e não
// bloqueia, e o tradutor entrega ao núcleo o que ele espera.

const brand = { name: 'GenkaiLabs', handle: '@genkailabs', niche: 'marketing', tone: 'direto' };

const conteudo = {
  title: 'A inteligência artificial está mudando como empresas conseguem novos clientes',
  subtitle: 'Entenda o que muda na prática para quem vende todo dia pela internet.',
  bullets: ['Primeiro erro que custa caro', 'Segundo erro que ninguém revisa', 'Terceiro erro fácil de evitar'],
  cta: 'Salve para consultar depois'
};

describe('tradução da superfície para o núcleo', () => {
  it('converte pixels do canvas em porcentagem do slide', () => {
    const surface = {
      layers: [
        { id: 'a', type: 'text', componentId: 'titulo', text: 'oi', x: 108, y: 135, w: 540, h: 270, fs: 60, weight: 800 }
      ]
    };
    const { blocos, largura, altura } = superficieParaRevisao(surface, [1080, 1350]);
    expect(largura).toBe(1080);
    expect(altura).toBe(1350);
    expect(blocos[0].caixa).toEqual({ x: 10, y: 10, w: 50, h: 20 });
  });

  it('marca painel e véu como decorativos, para não virarem sobreposição', () => {
    const surface = {
      layers: [
        { id: 'p', type: 'shape', componentId: 'painel', x: 0, y: 0, w: 1080, h: 1350 },
        { id: 'v', type: 'shape', componentId: 'sobreposicao', x: 0, y: 0, w: 1080, h: 1350 }
      ]
    };
    const { blocos } = superficieParaRevisao(surface, [1080, 1350]);
    expect(blocos.every((b) => b.decorativo)).toBe(true);
  });

  it('não quebra com canvas inválido', () => {
    expect(superficieParaRevisao({ layers: [] }, [0, 0]).blocos).toEqual([]);
    expect(superficieParaRevisao(null, [1080, 1350]).blocos).toEqual([]);
  });
});

describe('composeSmartPost', () => {
  const peca = composeSmartPost({ content: conteudo, brand, format: 'post', ratio: '4:5' });

  it('devolve a revisão junto da peça', () => {
    expect(peca.revisao).toBeTruthy();
    expect(typeof peca.revisao.nota).toBe('number');
    expect(peca.revisao.nota).toBeGreaterThanOrEqual(0);
    expect(peca.revisao.nota).toBeLessThanOrEqual(100);
    expect(Array.isArray(peca.revisao.problemas)).toBe(true);
  });

  it('a revisão DESCREVE e não altera a peça nem reprova a montagem', () => {
    // `ok` continua sendo sobre a validação do §14, que é quem tem autoridade
    // para dizer que a peça está quebrada. Uma viúva não impede publicar.
    expect(peca.ok).toBe(true);
    expect(peca.surface.layers.length).toBeGreaterThan(0);
  });

  it('roda depois do conserto: não acusa o que o validador já resolveu', () => {
    const ids = peca.revisao.problemas.map((p) => p.id);
    // `texto_cortado` é consertado por `applyLayoutFix` reduzindo o corpo. Se a
    // revisão rodasse antes, ela apontaria um defeito que já não existe.
    expect(ids).not.toContain('texto_cortado');
  });

  it('cada problema tem severidade conhecida e mensagem legível', () => {
    for (const problema of peca.revisao.problemas) {
      expect(['critico', 'atencao', 'sugestao']).toContain(problema.severidade);
      expect(problema.mensagem.length).toBeGreaterThan(10);
    }
  });
});

describe('composeSmartCarousel', () => {
  const carrossel = composeSmartCarousel({ content: conteudo, brand, ratio: '4:5' });

  it('devolve nota do carrossel inteiro, não de um slide', () => {
    expect(carrossel.notaDiagramacao).toBe(carrossel.revisao.nota);
    expect(carrossel.revisao.slides).toHaveLength(carrossel.slides.length);
    expect(carrossel.revisao.veredito).toBeTruthy();
  });

  it('a revisão do conjunto enxerga o que nenhum slide sozinho enxerga', () => {
    // `conjunto` só carrega problemas que dependem de comparar slides.
    for (const problema of carrossel.revisao.conjunto) {
      expect(['margens_inconstantes', 'manchete_inconstante', 'entrelinha_inconstante'])
        .toContain(problema.id);
    }
  });

  it('todo problema sabe de qual slide veio', () => {
    for (const slide of carrossel.revisao.slides) {
      for (const problema of slide.problemas) expect(problema.slide).toBe(slide.indice);
    }
  });

  it('não bloqueia a entrega do carrossel', () => {
    expect(carrossel.slides.length).toBeGreaterThan(1);
    expect(carrossel.ok).toBe(true);
  });
});
