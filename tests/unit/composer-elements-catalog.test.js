import { describe, expect, it } from 'vitest';
import { ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS } from '@/lib/composer-text-styles';
import { ELEMENT_ICON_MAP, ELEMENT_VECTOR_ICONS, iconLayerPreset } from '@/data/element-icons';
import { EMOJI_CATEGORIES, EMOJI_NAMES, normalizeSearch, searchEmojis } from '@/data/emoji-catalog';

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

describe('ícones vetoriais (PRD Elementos §8)', () => {
  it('disponibiliza os 24 ícones do PRD', () => {
    expect(ELEMENT_VECTOR_ICONS.map((icon) => icon.id)).toEqual([
      'telefone', 'whatsapp', 'instagram', 'localizacao', 'calendario', 'relogio',
      'link', 'carrinho', 'dinheiro', 'promocao', 'atencao', 'check', 'estrela',
      'coracao', 'play', 'pause', 'volume', 'camera', 'mensagem', 'email',
      'usuario', 'seta', 'grafico', 'loja'
    ]);
  });

  it('todo ícone tem label, keywords e markup vetorial com currentColor', () => {
    for (const icon of ELEMENT_VECTOR_ICONS) {
      expect(icon.label.length).toBeGreaterThan(0);
      expect(icon.keywords.length).toBeGreaterThan(0);
      expect(icon.body).toContain('currentColor');
      expect(icon.body).toMatch(/<(path|circle|rect|line|polyline|polygon|ellipse|g)/);
    }
    expect(ELEMENT_ICON_MAP.whatsapp.body).toContain('scale');
  });

  it('gera preset de camada do tipo icon', () => {
    expect(iconLayerPreset(ELEMENT_ICON_MAP.telefone)).toMatchObject({
      type: 'icon', icon: 'telefone', w: 64, h: 64, color: '#FFFFFF'
    });
  });
});

describe('busca de emojis (PRD Elementos §12)', () => {
  it('normaliza acentos e caixa', () => {
    expect(normalizeSearch('  Coração ')).toBe('coracao');
    expect(normalizeSearch('PROMOÇÃO')).toBe('promocao');
  });

  it('todo emoji do catálogo tem nome de busca', () => {
    for (const category of EMOJI_CATEGORIES) {
      for (const emoji of category.emojis) {
        expect(EMOJI_NAMES[emoji], `sem nome: ${emoji}`).toBeTruthy();
      }
    }
  });

  it('encontra por nome, categoria e palavra relacionada', () => {
    expect(searchEmojis('fogo')).toContain('🔥');
    expect(searchEmojis('coração')).toContain('❤️');
    expect(searchEmojis('animais')).toContain('🐶');
    expect(searchEmojis('pizza')).toEqual(['🍕']);
    expect(searchEmojis('')).toEqual([]);
    expect(searchEmojis('zzz-nada')).toEqual([]);
  });
});
