import { describe, expect, it } from 'vitest';
import { validateLayout, validateAndFix, validateSlideConsistency, applyLayoutFix } from '@/lib/layouts/validate';

const canvas = [430, 430];
const insets = { x: 28, top: 28, bottom: 28 };
const palette = { bg: '#FFFFFF', ink: '#111111', accent: '#0F766E', onAccent: '#FFFFFF', surface: '#F3F4F6', muted: '#5B5B5B' };

function textLayer(patch = {}) {
  return {
    id: 'l1', type: 'text', componentId: 'titulo', text: 'Um titulo',
    x: 28, y: 28, w: 374, h: 90, fs: 28, weight: 800, lh: 1.05,
    color: '#111111', fill: 'transparent', bgMode: 'none', shOn: false,
    ...patch
  };
}

function surfaceWith(layers, extra = {}) {
  return { media: null, bg: { x: 0, y: 0, scale: 1, rot: 0 }, layers, ...extra };
}

describe('checklist do §14', () => {
  it('acusa texto que não cabe na caixa', () => {
    const surface = surfaceWith([textLayer({ text: 'x'.repeat(200), h: 40 })]);
    const { ok, issues } = validateLayout({ surface, canvas, insets, palette });
    expect(ok).toBe(false);
    expect(issues.map((i) => i.id)).toContain('texto_cortado');
  });

  it('acusa texto fora da área segura', () => {
    const surface = surfaceWith([textLayer({ x: 2, y: 2, w: 100, h: 30, text: 'oi' })]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('fora_area_segura');
  });

  it('cobra margem maior da logo (§14)', () => {
    const surface = surfaceWith([textLayer({
      componentId: 'logo', text: '@marca', x: 30, y: 380, w: 120, h: 20, fs: 12, weight: 700
    })]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('logo_na_borda');
  });

  it('acusa contraste ruim', () => {
    const surface = surfaceWith([textLayer({ componentId: 'subtitulo', color: '#EFEFEF', text: 'apoio', h: 40, fs: 14, weight: 400 })]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('contraste_baixo');
  });

  it('acusa excesso de caracteres do componente', () => {
    const surface = surfaceWith([textLayer({ componentId: 'cta', type: 'button', text: 'a'.repeat(60), w: 300, h: 200, fs: 12, fill: '#0F766E', color: '#FFFFFF' })]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('excesso_caracteres');
  });

  it('acusa elementos sobrepostos', () => {
    const surface = surfaceWith([
      textLayer({ id: 'a', text: 'um', h: 60 }),
      textLayer({ id: 'b', componentId: 'subtitulo', text: 'dois', y: 40, h: 60, fs: 14, weight: 400 })
    ]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('elementos_sobrepostos');
  });

  it('não trata painel e véu como sobreposição — eles existem para ficar embaixo', () => {
    const surface = surfaceWith([
      { id: 'p', type: 'shape', componentId: 'painel', text: '', x: 0, y: 0, w: 430, h: 430, fill: '#F3F4F6' },
      textLayer({ id: 'a', text: 'um', h: 60 })
    ]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).not.toContain('elementos_sobrepostos');
  });

  // O fundo da peça fica embaixo de tudo; um painel escuro por cima dele é o que
  // o texto realmente vê. Considerar só o primeiro painel da lista aprovava
  // título escuro sobre painel escuro — o render mostrou o título sumindo.
  it('mede o contraste contra o painel mais alto abaixo do texto', () => {
    const surface = surfaceWith([
      { id: 'fundo', type: 'shape', componentId: 'painel', text: '', x: 0, y: 0, w: 430, h: 430, fill: '#FFFFFF' },
      { id: 'painel', type: 'shape', componentId: 'painel', text: '', x: 0, y: 0, w: 430, h: 430, fill: '#1C1A16' },
      textLayer({ id: 't', color: '#111111', text: 'Titulo sobre painel escuro', h: 90 })
    ]);
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('contraste_baixo');
  });

  it('acusa imagem esticada', () => {
    const surface = surfaceWith([], {
      media: { url: 'x', width: 1600, height: 900 },
      bg: { x: 0, y: 0, w: 430, h: 430, scale: 1, rot: 0 }
    });
    const ids = validateLayout({ surface, canvas, insets, palette }).issues.map((i) => i.id);
    expect(ids).toContain('imagem_distorcida');
  });

  it('cobra CTA quando a peça exige', () => {
    const surface = surfaceWith([textLayer()]);
    const ids = validateLayout({ surface, canvas, insets, palette, requireCta: true }).issues.map((i) => i.id);
    expect(ids).toContain('cta_ausente');
  });

  it('aceita peça correta', () => {
    const surface = surfaceWith([textLayer({ text: 'Um titulo curto', h: 90, fs: 28 })]);
    expect(validateLayout({ surface, canvas, insets, palette }).ok).toBe(true);
  });
});

describe('correção automática (§14)', () => {
  it('reduz o corpo até o texto caber', () => {
    const surface = surfaceWith([textLayer({ text: 'Um titulo bastante comprido para a caixa disponivel', h: 40 })]);
    const antes = surface.layers[0].fs;
    const result = validateAndFix({ surface, canvas, insets, palette });
    expect(result.applied).toContain('texto_cortado');
    expect(result.surface.layers[0].fs).toBeLessThan(antes);
  });

  it('traz o elemento para dentro da margem com coordenada inteira', () => {
    const surface = surfaceWith([textLayer({ x: 2, y: 2, w: 100, h: 30, text: 'oi', fs: 12, weight: 400 })]);
    const result = validateAndFix({ surface, canvas, insets, palette });
    expect(result.applied).toContain('fora_area_segura');
    expect(Number.isInteger(result.surface.layers[0].x)).toBe(true);
    expect(result.surface.layers[0].x).toBeGreaterThanOrEqual(28);
  });

  it('escurece o texto até passar no contraste', () => {
    const surface = surfaceWith([textLayer({ componentId: 'subtitulo', color: '#EFEFEF', text: 'apoio', h: 40, fs: 14, weight: 400 })]);
    const result = validateAndFix({ surface, canvas, insets, palette });
    expect(result.applied).toContain('contraste_baixo');
    expect(result.surface.layers[0].color).not.toBe('#EFEFEF');
  });

  it('reenquadra a imagem esticada mantendo a proporção', () => {
    const surface = surfaceWith([], {
      media: { url: 'x', width: 1600, height: 900 },
      bg: { x: 0, y: 0, w: 430, h: 430, scale: 1, rot: 0 }
    });
    const result = validateAndFix({ surface, canvas, insets, palette });
    expect(result.applied).toContain('imagem_distorcida');
    expect(Math.abs(result.surface.bg.w / result.surface.bg.h - 1600 / 900)).toBeLessThan(0.02);
  });

  it('não inventa CTA: o problema sobe para o usuário', () => {
    const surface = surfaceWith([textLayer({ text: 'Titulo curto' })]);
    const result = validateAndFix({ surface, canvas, insets, palette, requireCta: true });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.id)).toContain('cta_ausente');
    expect(result.applied).not.toContain('cta_ausente');
  });
});

describe('consistência entre slides (§14)', () => {
  // O ritmo do §9 exige estruturas diferentes entre os slides. O que precisa ser
  // igual é o estilo — é ele que faz a sequência ler como uma peça só.
  it('aceita estruturas diferentes quando o estilo é o mesmo', () => {
    expect(validateSlideConsistency([
      { structureId: 'capa-carrossel', styleId: 'editorial' },
      { structureId: 'slide-explicacao', styleId: 'editorial' },
      { structureId: 'lista-visual', styleId: 'editorial' },
      { structureId: 'slide-cta', styleId: 'editorial' }
    ]).ok).toBe(true);
  });

  it('reprova estilos diferentes no mesmo carrossel', () => {
    const result = validateSlideConsistency([
      { structureId: 'capa-carrossel', styleId: 'editorial' },
      { structureId: 'manchete', styleId: 'comercial' }
    ]);
    expect(result.ok).toBe(false);
    expect(result.issues[0].id).toBe('slides_inconsistentes');
  });
});

describe('applyLayoutFix', () => {
  it('devolve false quando não há conserto determinístico', () => {
    const surface = surfaceWith([textLayer()]);
    expect(applyLayoutFix({ issue: { id: 'cta_ausente' }, surface, canvas, palette })).toBe(false);
  });
});
