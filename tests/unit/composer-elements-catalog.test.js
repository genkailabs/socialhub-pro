import { describe, expect, it } from 'vitest';
import { ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS } from '@/lib/composer-text-styles';

describe('catálogo de elementos (PRD Elementos §5, §7, §10)', () => {
  it('disponibiliza as 11 formas do PRD', () => {
    expect(ELEMENT_SHAPES.map((shape) => shape.label)).toEqual([
      'Quadrado', 'Retângulo', 'Retângulo arredondado', 'Círculo', 'Elipse',
      'Triângulo', 'Estrela', 'Hexágono', 'Balão', 'Faixa', 'Pill'
    ]);
    for (const shape of ELEMENT_SHAPES) {
      expect(Array.isArray(shape.keywords)).toBe(true);
      expect(shape.keywords.length).toBeGreaterThan(0);
      expect(['shape', 'button']).toContain(shape.preset.type);
    }
    const kinds = ELEMENT_SHAPES.filter((shape) => shape.preset.type === 'shape').map((shape) => shape.preset.shape);
    expect(kinds).toContain('ellipse');
    expect(kinds).toContain('triangle');
    expect(kinds).toContain('star');
    expect(kinds).toContain('hexagon');
  });

  it('disponibiliza as 7 linhas e setas do PRD', () => {
    expect(ELEMENT_LINES.map((line) => line.label)).toEqual([
      'Linha reta', 'Linha pontilhada', 'Linha tracejada', 'Linha arredondada',
      'Seta simples', 'Seta dupla', 'Seta curva'
    ]);
    const byLabel = Object.fromEntries(ELEMENT_LINES.map((line) => [line.label, line.preset]));
    expect(byLabel['Linha pontilhada']).toMatchObject({ type: 'line', dash: 'dotted', cap: 'round' });
    expect(byLabel['Linha tracejada']).toMatchObject({ type: 'line', dash: 'dashed' });
    expect(byLabel['Linha arredondada']).toMatchObject({ type: 'line', cap: 'round' });
    expect(byLabel['Seta dupla']).toMatchObject({ type: 'arrow', heads: 2 });
    expect(byLabel['Seta curva']).toMatchObject({ type: 'arrow', curve: true });
  });

  it('disponibiliza os 15 stickers do PRD na ordem do documento', () => {
    expect(SOCIALHUB_STICKERS.map((sticker) => sticker.label)).toEqual([
      'Novo', 'Oferta', 'Promoção', 'Saiba mais', 'Clique aqui', 'Link na bio',
      'Últimas vagas', 'Lançamento', 'Em breve', 'Frete grátis', 'Desconto',
      'Arraste para cima', 'Confira', 'Aproveite', 'Vagas limitadas'
    ]);
  });
});
