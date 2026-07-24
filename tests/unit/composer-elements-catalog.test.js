import { describe, expect, it } from 'vitest';
import { ELEMENT_LINES, ELEMENT_SHAPES, SOCIALHUB_STICKERS } from '@/lib/composer-text-styles';
import { ELEMENT_ICON_MAP, ELEMENT_VECTOR_ICONS, iconLayerPreset } from '@/data/element-icons';
import { EMOJI_CATEGORIES, EMOJI_NAMES, normalizeSearch, searchEmojis } from '@/data/emoji-catalog';
import { addLayer, makeSurface, serializeComposer } from '@/lib/composer-editor';

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

describe('persistência dos elementos (PRD Elementos §15)', () => {
  it('serializa todas as propriedades novas das camadas', () => {
    const surface = makeSurface();
    addLayer(surface, { type: 'shape', shape: 'star', fill: '#FFD60A', strokeW: 2, strokeColor: '#111', shOn: true }, [430, 430], 'l1');
    addLayer(surface, { type: 'line', dash: 'dotted', cap: 'round', fill: '#FFF' }, [430, 430], 'l2');
    addLayer(surface, { type: 'arrow', heads: 2, curve: true, fill: '#FFF' }, [430, 430], 'l3');
    addLayer(surface, { type: 'icon', icon: 'whatsapp', color: '#25D366' }, [430, 430], 'l4');
    const state = { doc: { post: surface }, format: 'post', undoStack: [1], redoStack: [2], sel: 'l1', editing: 'l1' };
    const saved = serializeComposer(state);
    const [shape, line, arrow, icon] = saved.doc.post.layers;
    expect(shape).toMatchObject({ shape: 'star', strokeW: 2, shOn: true, locked: false, hidden: false });
    expect(line).toMatchObject({ dash: 'dotted', cap: 'round' });
    expect(arrow).toMatchObject({ heads: 2, curve: true });
    expect(icon).toMatchObject({ type: 'icon', icon: 'whatsapp', color: '#25D366' });
    expect(saved.undoStack).toBeUndefined();
    expect(saved.sel).toBeUndefined();
  });
});
