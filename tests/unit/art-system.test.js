import { describe, expect, it } from 'vitest';
import {
  styleForNiche, NICHE_STYLES, typeScale, hasTypographicHierarchy,
  framePadding, densityFor
} from '@/lib/ai/art/style';
import { selectLayout, eligibleLayouts, layoutFits, layoutById, layoutIds } from '@/lib/ai/art/layouts';
import { contrastRatio, checkArt, parseHex, MIN_CONTRAST_BODY } from '@/lib/ai/art/quality';

// §14: o estilo acompanha o setor da marca.
describe('styleForNiche', () => {
  it('reconhece o nicho por palavra-chave', () => {
    expect(styleForNiche('Clínica odontológica').id).toBe('saude');
    expect(styleForNiche('escritório de advocacia').id).toBe('advocacia');
    expect(styleForNiche('Hamburgueria artesanal').id).toBe('restaurante');
    expect(styleForNiche('startup de software').id).toBe('tecnologia');
    expect(styleForNiche('corretor de imóveis').id).toBe('imobiliaria');
  });

  // Estilo errado e pior que estilo neutro.
  it('cai em geral quando nao reconhece, sem chutar', () => {
    expect(styleForNiche('').id).toBe('geral');
    expect(styleForNiche('petshop do bairro').id).toBe('geral');
  });

  it('todo nicho declara paleta e modo de superficie', () => {
    for (const estilo of Object.values(NICHE_STYLES)) {
      expect(estilo.gradient).toHaveLength(2);
      expect(estilo.accentFallback).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(['dark', 'light', 'photo']).toContain(estilo.surfaceMode);
    }
  });
});

// §16/§17: hierarquia e aproveitamento de espaco.
describe('tipografia', () => {
  it('escala proporcional ao lado menor, servindo feed e story', () => {
    const feed = typeScale({ width: 1080, height: 1080 });
    const story = typeScale({ width: 1080, height: 1920 });
    // Story e mais alto, mas o lado menor e o mesmo: a escala nao muda.
    expect(story.title).toBe(feed.title);
    expect(feed.title).toBeGreaterThan(feed.subtitle);
    expect(feed.subtitle).toBeGreaterThan(feed.body);
  });

  it('nunca deixa o texto cair abaixo do piso legivel', () => {
    const apertado = typeScale({ width: 1080, height: 1080, density: 'dense' });
    expect(apertado.title).toBeGreaterThanOrEqual(54);
    expect(apertado.body).toBeGreaterThanOrEqual(24);
  });

  it('reconhece falta de hierarquia', () => {
    expect(hasTypographicHierarchy(typeScale({}))).toBe(true);
    expect(hasTypographicHierarchy({ title: 30, body: 28 })).toBe(false);
    expect(hasTypographicHierarchy({})).toBe(false);
  });

  it('margem e proporcional, nao fixa em 96px', () => {
    expect(framePadding({ width: 1080, height: 1080 })).toBe(67);
    expect(framePadding({ width: 540, height: 540 })).toBe(33);
  });

  it('densidade acompanha o volume de texto', () => {
    expect(densityFor('a'.repeat(300))).toBe('dense');
    expect(densityFor('curto')).toBe('airy');
    expect(densityFor('a'.repeat(120))).toBe('normal');
  });
});

// §15: variacao automatica de layouts.
describe('selecao de layout', () => {
  const comImagem = { hasImage: true, subtext: 'apoio', bullets: [] };

  it('so oferece layout que o conteudo sustenta', () => {
    // Comparativo exige exatamente dois lados.
    expect(layoutFits(layoutById('comparativo'), { bullets: ['a', 'b'] })).toBe(true);
    expect(layoutFits(layoutById('comparativo'), { bullets: ['a'] })).toBe(false);
    expect(layoutFits(layoutById('comparativo'), { bullets: ['a', 'b', 'c'] })).toBe(false);
    // Cards precisa de tres ou mais itens.
    expect(layoutFits(layoutById('cards'), { bullets: ['a', 'b', 'c'] })).toBe(true);
    // Hero precisa de imagem.
    expect(layoutFits(layoutById('hero'), { hasImage: false })).toBe(false);
  });

  it('nao repete o layout usado no post anterior', () => {
    const escolhido = selectLayout({ content: comImagem, recentLayouts: ['hero'] });
    expect(escolhido.id).not.toBe('hero');
  });

  it('evita todos os layouts recentes quando ainda ha alternativa', () => {
    const escolhido = selectLayout({ content: comImagem, recentLayouts: ['hero', 'editorial'] });
    expect(['magazine', 'mockup']).toContain(escolhido.id);
  });

  it('com tudo usado recentemente, so evita o ultimo — nunca fica sem layout', () => {
    const escolhido = selectLayout({ content: comImagem, recentLayouts: layoutIds() });
    expect(escolhido).toBeTruthy();
    expect(escolhido.id).not.toBe(layoutIds()[0]);
  });

  it('sem candidato elegivel devolve fallback em vez de quebrar', () => {
    const escolhido = selectLayout({ content: { hasImage: false, bullets: [], subtext: '' } });
    expect(escolhido).toBeTruthy();
    expect(eligibleLayouts({ hasImage: false, bullets: [], subtext: '' })).toEqual([]);
  });

  it('a escolha e deterministica para o mesmo seed', () => {
    const a = selectLayout({ content: comImagem, seed: 3 });
    const b = selectLayout({ content: comImagem, seed: 3 });
    expect(a.id).toBe(b.id);
  });
});

// §19: controle de qualidade automatico.
describe('checkArt', () => {
  const boa = {
    title: 'Como economizar na conta de luz',
    subtitle: 'Tres ajustes simples que reduzem o consumo.',
    bullets: [],
    palette: { bg: '#FFFFFF', ink: '#111111', accent: '#4F46E5' },
    scale: typeScale({}),
    layout: layoutById('editorial'),
    hasImage: true,
    followsBrandKit: true
  };

  it('aprova arte que cumpre o checklist', () => {
    const r = checkArt(boa);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('calcula contraste WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('nao-e-cor', '#FFF')).toBeNull();
  });

  it('aceita hex de 3 digitos e com ou sem cerquilha', () => {
    expect(parseHex('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseHex('xyz')).toBeNull();
  });

  it('reprova texto claro sobre fundo claro', () => {
    const r = checkArt({ ...boa, palette: { ...boa.palette, ink: '#DDDDDD' } });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.id)).toContain('contraste_baixo');
    expect(contrastRatio('#DDDDDD', '#FFFFFF')).toBeLessThan(MIN_CONTRAST_BODY);
  });

  it('reprova titulo que nao se le no feed', () => {
    const r = checkArt({ ...boa, title: 'a'.repeat(120) });
    expect(r.issues.map((i) => i.id)).toContain('titulo_longo');
  });

  it('reprova peca vazia sem imagem (§17)', () => {
    const r = checkArt({ ...boa, title: 'Oi', subtitle: '', bullets: [], hasImage: false, layout: layoutById('cards') });
    expect(r.issues.map((i) => i.id)).toContain('peca_vazia');
  });

  it('cobra imagem quando o layout promete imagem', () => {
    const r = checkArt({ ...boa, hasImage: false });
    expect(r.issues.map((i) => i.id)).toContain('imagem_ausente');
  });

  it('reprova arte fora do Brand Kit (§18)', () => {
    const r = checkArt({ ...boa, followsBrandKit: false });
    expect(r.issues.map((i) => i.id)).toContain('fora_do_brand_kit');
  });

  it('todo problema traz o que fazer para corrigir', () => {
    const r = checkArt({ ...boa, palette: { ...boa.palette, ink: '#DDDDDD' }, title: 'a'.repeat(120) });
    expect(r.issues.length).toBeGreaterThan(1);
    for (const problema of r.issues) {
      expect(problema.fix).toBeTruthy();
    }
  });
});
