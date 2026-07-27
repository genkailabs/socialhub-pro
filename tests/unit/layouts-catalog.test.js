import { describe, expect, it } from 'vitest';
import { COMPONENTS, componentById, componentIds, componentText, trimToLimit, dynamicComponentIds, fixedComponentIds } from '@/lib/layouts/components';
import { VISUAL_STYLES, styleIds, styleTypeScale, styleInsets, styleForKeywords, styleById } from '@/lib/layouts/styles';
import { STRUCTURES, structureIds, structureFits, eligibleStructures, contentUsage } from '@/lib/layouts/structures';

// §17: o MVP promete números concretos. Se o catálogo encolher, o produto
// entregue deixa de bater com o que foi combinado.
describe('catálogo do MVP (§17)', () => {
  it('tem 12 estruturas, 8 estilos e 20 componentes', () => {
    expect(STRUCTURES).toHaveLength(12);
    expect(VISUAL_STYLES).toHaveLength(8);
    expect(COMPONENTS.length).toBeGreaterThanOrEqual(20);
  });

  it('não repete id em nenhum catálogo', () => {
    expect(new Set(structureIds()).size).toBe(STRUCTURES.length);
    expect(new Set(styleIds()).size).toBe(VISUAL_STYLES.length);
    expect(new Set(componentIds()).size).toBe(COMPONENTS.length);
  });

  it('todo slot de estrutura aponta para um componente existente', () => {
    for (const structure of STRUCTURES) {
      for (const slot of structure.slots) {
        expect(componentById(slot.component), `${structure.id} → ${slot.component}`).toBeTruthy();
      }
    }
  });

  it('todo slot cabe dentro da área da peça', () => {
    for (const structure of STRUCTURES) {
      for (const slot of structure.slots) {
        expect(slot.x + slot.w, `${structure.id}/${slot.component}`).toBeLessThanOrEqual(1.001);
        expect(slot.y + slot.h, `${structure.id}/${slot.component}`).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it('os 8 estilos declaram os controles do §6', () => {
    for (const style of VISUAL_STYLES) {
      expect(style.fonts.title).toBeTruthy();
      expect(style.fonts.body).toBeTruthy();
      expect(['baixa', 'media', 'alta']).toContain(style.intensity);
      expect(['full', 'framed', 'accent', 'avoid']).toContain(style.imageMode);
      expect(['box', 'underline', 'color', 'none']).toContain(style.highlight);
      expect(typeof style.radius).toBe('number');
      expect(typeof style.spacing).toBe('number');
    }
  });

  it('separa elementos fixos de dinâmicos (§11)', () => {
    expect(dynamicComponentIds()).toContain('titulo');
    expect(dynamicComponentIds()).toContain('cta');
    expect(fixedComponentIds()).toContain('painel');
    expect(fixedComponentIds()).toContain('sobreposicao');
  });
});

describe('texto do componente', () => {
  it('corta no limite sem partir palavra', () => {
    const cut = trimToLimit('Como economizar energia eletrica na sua casa neste verao inteiro', 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/\s…$/);
  });

  it('acrescenta a interrogação da pergunta só quando falta', () => {
    const pergunta = componentById('pergunta');
    expect(componentText(pergunta, { question: 'Voce ja revisou seu contrato' })).toBe('Voce ja revisou seu contrato?');
    expect(componentText(pergunta, { question: 'Voce ja revisou?' })).toBe('Voce ja revisou?');
  });

  it('envolve a citação em aspas editáveis', () => {
    expect(componentText(componentById('citacao'), { quote: 'Detalhe é projeto' })).toBe('“Detalhe é projeto”');
  });

  it('devolve vazio quando o conteúdo não existe', () => {
    expect(componentText(componentById('cta'), {})).toBe('');
  });

  it('lê o item certo da lista pelo índice do slot', () => {
    expect(componentText(componentById('lista'), { bullets: ['um', 'dois', 'tres'] }, 1)).toBe('dois');
  });
});

describe('estilo', () => {
  it('mantém hierarquia: título é pelo menos 1.8x o corpo', () => {
    for (const style of VISUAL_STYLES) {
      const scale = styleTypeScale(style, { width: 430, height: 430 });
      expect(scale.title / scale.body, style.id).toBeGreaterThanOrEqual(1.8);
    }
  });

  it('dá margem vertical maior na peça alta (interface do Instagram por cima)', () => {
    const style = styleById('minimalista');
    const story = styleInsets(style, { width: 292, height: 519 });
    const feed = styleInsets(style, { width: 430, height: 430 });
    expect(story.top).toBeGreaterThan(story.x);
    expect(feed.top).toBe(feed.x);
  });

  it('casa estilo por palavra-chave e ignora acento', () => {
    expect(styleForKeywords('Escritório de advocacia').id).toBe('premium');
    expect(styleForKeywords('clinica odontologica').id).toBe('acolhedor');
    expect(styleForKeywords('')).toBeNull();
  });
});

describe('elegibilidade da estrutura (§13)', () => {
  const semNada = { title: 'Um titulo qualquer' };

  it('descarta comparativo sem exatamente dois itens', () => {
    const comparativo = STRUCTURES.find((s) => s.id === 'comparativo');
    expect(structureFits(comparativo, { ...semNada, bullets: ['a'] })).toBe(false);
    expect(structureFits(comparativo, { ...semNada, bullets: ['a', 'b'] })).toBe(true);
    expect(structureFits(comparativo, { ...semNada, bullets: ['a', 'b', 'c'] })).toBe(false);
  });

  it('descarta estruturas que exigem imagem quando não há imagem', () => {
    const ids = eligibleStructures(semNada, 'square').map((s) => s.id);
    expect(ids).not.toContain('imagem-titulo');
    expect(ids).toContain('manchete');
  });

  it('descarta a estrutura de citação sem citação', () => {
    const ids = eligibleStructures(semNada, 'square').map((s) => s.id);
    expect(ids).not.toContain('citacao');
    expect(eligibleStructures({ ...semNada, quote: 'frase' }, 'square').map((s) => s.id)).toContain('citacao');
  });

  it('pontua mais quem aproveita mais do conteúdo', () => {
    const conteudo = { hasImage: true, subtitle: 'apoio', bullets: [], cta: 'Saiba mais' };
    const comImagem = STRUCTURES.find((s) => s.id === 'imagem-titulo');
    const semImagem = STRUCTURES.find((s) => s.id === 'manchete');
    expect(contentUsage(comImagem, conteudo)).toBeGreaterThan(contentUsage(semImagem, conteudo));
  });
});
