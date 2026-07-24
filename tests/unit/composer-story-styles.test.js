import { describe, expect, it } from 'vitest';
import { addLayer, layerDisplayText, makeSurface, reorderLayer } from '@/lib/composer-editor';
import { FONT_LIBRARY, fontFamilyCss, fontsByCategory, resolveFontWeight } from '@/lib/composer-fonts';
import { ELEMENT_LINES, SOCIALHUB_STICKERS, TEXT_STYLES } from '@/lib/composer-text-styles';
import { EMOJI_CATEGORIES } from '@/data/emoji-catalog';
import { layerBoxStyle, layerLineBgStyle } from '@/lib/composer-layer-style';
import { buildComposerLayersSvg, emojiAssetFile, prepareLayersForSvg } from '@/lib/composer-media-render';

describe('melhorias do Composer de Story (PRD)', () => {
  it('disponibiliza os 13 estilos prontos e os 13 stickers do PRD', () => {
    expect(TEXT_STYLES.map((style) => style.label)).toEqual([
      'Moderno', 'Forte', 'Editorial', 'Clássico', 'Manuscrito', 'Máquina',
      'Divertido', 'Elegante', 'Destaque', 'Contornado', 'Sombreado', 'Faixa', 'Etiqueta'
    ]);
    expect(SOCIALHUB_STICKERS.map((sticker) => sticker.label)).toEqual([
      'Novo', 'Oferta', 'Promoção', 'Saiba mais', 'Clique aqui', 'Link na bio',
      'Últimas vagas', 'Lançamento', 'Em breve', 'Frete grátis', 'Desconto', 'Confira', 'Aproveite'
    ]);
  });

  it('organiza a biblioteca de fontes nas 8 categorias do PRD', () => {
    const groups = fontsByCategory();
    expect(groups.map((group) => group.category)).toEqual([
      'Modernas', 'Fortes', 'Editoriais', 'Clássicas', 'Manuscritas',
      'Monoespaçadas', 'Divertidas', 'Elegantes'
    ]);
    for (const group of groups) expect(group.fonts.length).toBeGreaterThanOrEqual(2);
    expect(fontFamilyCss('Anton')).toBe("'Anton', sans-serif");
    expect(fontFamilyCss('system-ui')).toBe('system-ui');
    expect(resolveFontWeight('Anton', 700)).toBe(400);
    expect(resolveFontWeight('Poppins', 700)).toBe(700);
  });

  it('cobre as categorias de emojis do PRD', () => {
    expect(EMOJI_CATEGORIES.map((category) => category.id)).toEqual([
      'pessoas', 'animais', 'comida', 'atividades', 'viagens', 'objetos', 'simbolos', 'bandeiras'
    ]);
    for (const category of EMOJI_CATEGORIES) expect(category.emojis.length).toBeGreaterThan(15);
  });

  it('aplica caixa alta/baixa e reordena camadas na pilha', () => {
    expect(layerDisplayText({ text: 'Promoção', tt: 'upper' })).toBe('PROMOÇÃO');
    expect(layerDisplayText({ text: 'Promoção', tt: 'lower' })).toBe('promoção');
    expect(layerDisplayText({ text: 'Promoção' })).toBe('Promoção');

    const surface = makeSurface();
    addLayer(surface, { text: 'A' }, [292, 519], 'a');
    addLayer(surface, { text: 'B' }, [292, 519], 'b');
    addLayer(surface, { text: 'C' }, [292, 519], 'c');
    expect(reorderLayer(surface, 'a', 1)).toBe(true);
    expect(surface.layers.map((layer) => layer.id)).toEqual(['b', 'a', 'c']);
    expect(reorderLayer(surface, 'c', 1)).toBe(false);
    expect(reorderLayer(surface, 'b', -1)).toBe(false);
  });

  it('gera estilo CSS idêntico para canvas e prévia com os novos recursos', () => {
    const layer = {
      type: 'text', x: 10, y: 20, w: 200, h: 60, fs: 24, weight: 700, italic: false,
      align: 'center', color: '#FFFFFF', font: 'Anton', rot: 0, op: 1, radius: 10,
      ls: 2, lh: 1.4, bgMode: 'box', bgFill: '#FFD60A', bgRadius: 12,
      strokeW: 2, strokeColor: '#111111', shOn: true, shX: 0, shY: 4, shB: 8, shColor: 'rgba(0,0,0,0.5)'
    };
    const style = layerBoxStyle(layer);
    expect(style.fontFamily).toBe("'Anton', sans-serif");
    expect(style.fontWeight).toBe(400);
    expect(style.background).toBe('#FFD60A');
    expect(style.borderRadius).toBe(12);
    expect(style.letterSpacing).toBe('2px');
    expect(style.lineHeight).toBe(1.4);
    expect(style.WebkitTextStroke).toBe('2px #111111');
    expect(style.textShadow).toBe('0px 4px 8px rgba(0,0,0,0.5)');

    expect(layerLineBgStyle(layer)).toBeNull();
    expect(layerLineBgStyle({ ...layer, bgMode: 'line' })).toMatchObject({ background: '#FFD60A' });
  });

  it('renderiza os novos estilos de texto no SVG final', () => {
    const svg = buildComposerLayersSvg([{
      type: 'text', text: 'Oferta especial', x: 10, y: 20, w: 200, h: 60, fs: 24,
      weight: 700, align: 'center', color: '#FFFFFF', font: 'Poppins', rot: 0, op: 1,
      ls: 1.5, lh: 1.3, tt: 'upper', bgMode: 'box', bgFill: '#FFD60A', bgRadius: 12,
      strokeW: 2, strokeColor: '#111111', shOn: true, shX: 0, shY: 4, shColor: 'rgba(0,0,0,0.5)'
    }]);
    expect(svg).toContain('OFERTA');
    expect(svg).toContain('ESPECIAL');
    expect(svg).toContain('letter-spacing="1.5"');
    expect(svg).toContain('fill="#FFD60A"');
    expect(svg).toContain('rx="12"');
    expect(svg).toContain('paint-order="stroke"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('translate(0 4)');
    expect(svg).toContain('Poppins');
  });

  it('renderiza fundo por linha, setas e cor transparente no SVG final', () => {
    const lineBg = buildComposerLayersSvg([{
      type: 'text', text: 'Duas palavras aqui', x: 0, y: 0, w: 80, h: 80, fs: 20,
      align: 'center', color: 'transparent', font: 'system-ui', rot: 0, op: 1,
      bgMode: 'line', bgFill: '#FFFFFF', bgRadius: 6, strokeW: 1.5, strokeColor: '#FFFFFF'
    }]);
    expect((lineBg.match(/<rect/g) || []).length).toBeGreaterThan(1);
    expect(lineBg).toContain('fill="none"');

    const arrow = buildComposerLayersSvg([{ type: 'arrow', x: 5, y: 5, w: 120, h: 30, fill: '#FFFFFF', rot: 0, op: 1 }]);
    expect(arrow).toContain('<line');
    expect(arrow).toContain('<polygon');
    expect(ELEMENT_LINES.some((item) => item.preset.type === 'arrow')).toBe(true);
  });

  it('substitui stickers de emoji por imagens Twemoji no arquivo final', async () => {
    expect(emojiAssetFile('🔥')).toContain('1f525');
    expect(emojiAssetFile('🏳️‍🌈')).toContain('1f3f3-200d-1f308');
    expect(emojiAssetFile('★')).toBeNull();
    const prepared = await prepareLayersForSvg([
      { type: 'sticker', text: '🔥', x: 0, y: 0, w: 62, h: 62, fs: 44, rot: 0, op: 1 },
      { type: 'sticker', text: '★', x: 0, y: 0, w: 60, h: 60, fs: 46, rot: 0, op: 1 }
    ], 1080 / 292);
    expect(prepared[0].type).toBe('image');
    expect(prepared[0].href).toMatch(/^data:image\/png;base64,/);
    expect(prepared[1].type).toBe('sticker');
    expect(buildComposerLayersSvg(prepared)).toContain('<image href="data:image/png;base64,');
  });

  it('novas camadas nascem com os padrões avançados serializáveis', () => {
    const surface = makeSurface();
    const layer = addLayer(surface, { text: 'Novo' }, [292, 519], 'layer-1');
    expect(layer).toMatchObject({
      ls: 0, lh: 1.05, tt: 'none', bgMode: 'none', strokeW: 0, shOn: false
    });
    expect(FONT_LIBRARY.length).toBe(16);
  });
});
