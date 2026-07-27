import { describe, expect, it } from 'vitest';
import { layoutTemplateFromSurface, applyLayoutTemplate, templateDynamicElements, templateFixedElements, describeTemplate } from '@/lib/layouts/templates';
import { composeSmartPost } from '@/lib/layouts/index';
import { mascotMessages } from '@/lib/layouts/mascot';

const kit = { palette: { accent: '#0F766E', bg: '#FFFFFF', ink: '#111111' } };
const content = {
  title: 'Nova regra muda o calculo do imposto',
  subtitle: 'A mudanca vale a partir do proximo mes.',
  eyebrow: 'Noticia',
  cta: 'Fale com a gente',
  brand: 'genkailabs'
};

describe('salvar como layout (§11)', () => {
  it('separa elementos fixos dos dinâmicos', () => {
    const built = composeSmartPost({ content, brand: {}, kit, structureId: 'manchete', styleId: 'jornalistico' });
    const template = layoutTemplateFromSurface(built.surface, {
      canvas: built.canvas, name: 'Manchete da marca', structureId: 'manchete', styleId: 'jornalistico'
    });

    expect(template.version).toBe(1);
    expect(templateDynamicElements(template).map((e) => e.componentId)).toContain('titulo');
    expect(templateFixedElements(template).map((e) => e.componentId)).toContain('painel');
    expect(describeTemplate(template)).toMatch(/dinâmic/);
  });

  it('guarda o texto do elemento dinâmico como exemplo, não como conteúdo', () => {
    const built = composeSmartPost({ content, brand: {}, kit, structureId: 'manchete' });
    const template = layoutTemplateFromSurface(built.surface, { canvas: built.canvas });
    const titulo = template.elements.find((e) => e.componentId === 'titulo');
    expect(titulo.sample).toBe(content.title);

    const surface = applyLayoutTemplate(template, { content: { ...content, title: 'Outro assunto' } });
    expect(surface.layers.find((l) => l.componentId === 'titulo').text).toBe('Outro assunto');
  });

  it('preserva o elemento fixo mesmo sem conteúdo novo', () => {
    const built = composeSmartPost({ content, brand: {}, kit, structureId: 'manchete' });
    const template = layoutTemplateFromSurface(built.surface, { canvas: built.canvas });
    const surface = applyLayoutTemplate(template, { content: { title: 'So o titulo', brand: 'marca' } });
    expect(surface.layers.some((l) => l.componentId === 'painel')).toBe(true);
  });

  it('descarta elemento dinâmico sem conteúdo em vez de deixar caixa vazia', () => {
    const built = composeSmartPost({ content, brand: {}, kit, structureId: 'estatistica' , styleId: 'corporativo'});
    const template = layoutTemplateFromSurface(built.surface, { canvas: built.canvas });
    const surface = applyLayoutTemplate(template, { content: { title: 'Titulo', brand: 'marca' } });
    expect(surface.layers.some((l) => l.componentId === 'cta')).toBe(false);
  });

  it('reescala ao aplicar num canvas de outra proporção', () => {
    const built = composeSmartPost({ content, brand: {}, kit, structureId: 'manchete' });
    const template = layoutTemplateFromSurface(built.surface, { canvas: built.canvas });
    const surface = applyLayoutTemplate(template, { content, canvas: [292, 519] });
    for (const layer of surface.layers) {
      expect(layer.x + layer.w).toBeLessThanOrEqual(293);
      expect(layer.y + layer.h).toBeLessThanOrEqual(520);
    }
  });

  it('respeita o papel marcado pelo usuário mesmo sobre camada solta', () => {
    const surface = { media: null, bg: {}, layers: [{ id: 'x1', type: 'text', text: 'Meu texto', x: 10, y: 10, w: 100, h: 30, fs: 14 }] };
    const template = layoutTemplateFromSurface(surface, { canvas: [430, 430], roles: { x1: 'titulo' } });
    expect(template.elements[0].behavior).toBe('dynamic');
    expect(applyLayoutTemplate(template, { content: { title: 'Novo' } }).layers[0].text).toBe('Novo');
  });

  it('camada sem papel vira elemento fixo', () => {
    const surface = { media: null, bg: {}, layers: [{ id: 'x1', type: 'shape', shape: 'rect', text: '', x: 10, y: 10, w: 100, h: 30, fill: '#000' }] };
    const template = layoutTemplateFromSurface(surface, { canvas: [430, 430] });
    expect(template.elements[0].behavior).toBe('fixed');
  });
});

describe('mascote (§15)', () => {
  it('explica tipo, estrutura, estilo e o que ajustou', () => {
    const built = composeSmartPost({ content, brand: { name: 'Genkai', niche: 'contabilidade' }, kit });
    const linhas = built.mascot.join(' ');
    expect(linhas).toMatch(/notícia|Este conteúdo/i);
    expect(linhas).toContain(built.plan.structure.label);
    expect(linhas).toContain(built.plan.style.label);
  });

  it('avisa quando teve de encurtar o texto', () => {
    const linhas = mascotMessages({ contentType: 'noticia', applied: ['texto_cortado'] });
    expect(linhas.join(' ')).toContain('reduzi o corpo');
  });

  it('avisa quando repetiu a estrutura por falta de alternativa (§13)', () => {
    const linhas = mascotMessages({ contentType: 'noticia', repeatedStructure: true });
    expect(linhas.join(' ')).toContain('já foi usada recentemente');
  });

  it('diz o que deixou de fora e por quê', () => {
    const linhas = mascotMessages({ contentType: 'noticia', skipped: ['cta'] });
    expect(linhas.join(' ')).toContain('Deixei de fora');
  });

  it('avisa quando a marca ainda não tem cores no Brand Kit', () => {
    const linhas = mascotMessages({
      contentType: 'noticia',
      style: { label: 'Editorial' },
      palette: { followsBrandKit: false }
    });
    expect(linhas.join(' ')).toContain('Brand Kit');
  });
});
