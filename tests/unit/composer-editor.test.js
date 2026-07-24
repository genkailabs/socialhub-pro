import { describe, expect, it } from 'vitest';
import {
  addLayer, canvasSize, computeSnap, fitMediaToCanvas, getSurface,
  makeComposerDocument, moveLayerToIndex, resizeMediaFromCorner, serializeComposer,
  toApiFormat, validateComposer, zoomMediaAtPoint
} from '@/lib/composer-editor';

describe('novo Composer visual', () => {
  it('mantém documentos e superfícies independentes por formato e slide', () => {
    const doc = makeComposerDocument();
    addLayer(doc.post, { text: 'Post' }, canvasSize('post', '1:1'), 'post-layer');
    addLayer(doc.carrossel.slides[0], { text: 'Slide 1' }, canvasSize('carrossel'), 'slide-layer');
    expect(getSurface(doc, 'post').layers.map((layer) => layer.text)).toEqual(['Post']);
    expect(getSurface(doc, 'carrossel').layers.map((layer) => layer.text)).toEqual(['Slide 1']);
    expect(doc.carrossel.slides[1].layers).toEqual([]);
  });

  it('calcula dimensões oficiais e converte formatos para a API existente', () => {
    expect(canvasSize('post', '4:5')).toEqual([384, 480]);
    expect(canvasSize('post', '3:4')).toEqual([384, 512]);
    expect(canvasSize('post', '1.91:1')).toEqual([600, 314]);
    expect(canvasSize('carrossel', '4:5')).toEqual([384, 480]);
    expect(canvasSize('story')).toEqual([292, 519]);
    expect(toApiFormat('carrossel')).toBe('carousel');
    expect(toApiFormat('story')).toBe('stories');
  });

  it('faz snap no centro e nas bordas do canvas com guias objetivas', () => {
    expect(computeSnap({ x: 161, y: 190, w: 100, h: 50, canvas: [430, 430] })).toEqual({
      x: 165, y: 190, guides: [{ axis: 'v', pos: 215 }, { axis: 'h', pos: 215 }]
    });
    expect(computeSnap({ x: 3, y: 386, w: 80, h: 40, canvas: [430, 430] })).toEqual({
      x: 0, y: 390, guides: [{ axis: 'v', pos: 0 }, { axis: 'h', pos: 430 }]
    });
    expect(computeSnap({ x: 200, y: 200, w: 40, h: 40, canvas: [430, 430], threshold: 0 })).toEqual({
      x: 200, y: 200, guides: []
    });
  });

  it('alinha pelas bordas e pelo centro de outro elemento', () => {
    const others = [{ x: 100, y: 60, w: 120, h: 80 }];
    expect(computeSnap({ x: 96, y: 300, w: 40, h: 30, canvas: [430, 430], others })).toMatchObject({
      x: 100, guides: [{ axis: 'v', pos: 100 }]
    });
    expect(computeSnap({ x: 300, y: 137, w: 40, h: 30, canvas: [430, 430], others })).toMatchObject({
      y: 140, guides: [{ axis: 'h', pos: 140 }]
    });
  });

  it('move uma camada para uma posição absoluta da pilha', () => {
    const surface = { media: null, bg: {}, layers: [] };
    for (const id of ['a', 'b', 'c']) addLayer(surface, { text: id }, [430, 430], id);
    expect(moveLayerToIndex(surface, 'a', 2)).toBe(true);
    expect(surface.layers.map((layer) => layer.id)).toEqual(['b', 'c', 'a']);
    expect(moveLayerToIndex(surface, 'a', 9)).toBe(false);
    expect(moveLayerToIndex(surface, 'c', 0)).toBe(true);
    expect(surface.layers.map((layer) => layer.id)).toEqual(['c', 'b', 'a']);
  });

  it('valida publicação e serializa o documento sem estado efêmero', () => {
    const doc = makeComposerDocument();
    const state = {
      doc, format: 'post', ratio: '1:1', caption: '', hashtags: '',
      undoStack: ['snapshot'], redoStack: ['snapshot'], sel: 'bg', editing: 'x'
    };
    expect(validateComposer(state)).toEqual({ ok: false, errors: ['Adicione uma mídia.'] });
    doc.post.media = { url: '/composer/post.png', kind: 'image' };
    expect(validateComposer(state).ok).toBe(true);
    expect(serializeComposer(state)).not.toHaveProperty('undoStack');
    expect(serializeComposer(state)).not.toHaveProperty('sel');
  });

  it('exige mídia em todos os slides antes de publicar um carrossel', () => {
    const doc = makeComposerDocument();
    doc.carrossel.slides[0].media = { url: '/composer/slide-1.png', kind: 'image' };
    const state = { doc, format: 'carrossel', ratio: '1:1', caption: '', hashtags: '' };

    expect(validateComposer(state)).toEqual(expect.objectContaining({
      ok: false,
      errors: expect.arrayContaining(['Adicione uma mídia em todos os slides do carrossel.'])
    }));
  });

  it('insere a midia inteira, proporcional e centralizada sem crop automatico', () => {
    expect(fitMediaToCanvas({ width: 1200, height: 800 }, [292, 519])).toEqual({
      x: 0,
      y: 162,
      w: 292,
      h: 195,
      scale: 1,
      rot: 0
    });
    expect(fitMediaToCanvas({ width: 1080, height: 1920 }, [430, 430])).toEqual({
      x: 94,
      y: 0,
      w: 242,
      h: 430,
      scale: 1,
      rot: 0
    });
  });

  it('faz zoom no cursor e redimensiona pelas alcas preservando a proporcao', () => {
    const original = { x: 50, y: 75, w: 200, h: 100, scale: 1, rot: 0 };
    const zoomed = zoomMediaAtPoint(original, { x: 100, y: 100 }, 2);
    expect(zoomed).toMatchObject({ x: 0, y: 50, w: 200, h: 100, scale: 2 });

    const resized = resizeMediaFromCorner(original, 'se', { dx: 100, dy: 50 });
    expect(resized).toMatchObject({ x: 50, y: 75, w: 200, h: 100, scale: 1.5 });
    expect((resized.w * resized.scale) / (resized.h * resized.scale)).toBe(2);
  });

  it('mantém a âncora do cursor e o canto oposto após rotação', () => {
    const rotated = { x: 50, y: 75, w: 200, h: 100, scale: 1, rot: 90 };
    const zoomed = zoomMediaAtPoint(rotated, { x: 150, y: 75 }, 2);
    expect(zoomed).toMatchObject({ x: -50, y: 75, scale: 2, rot: 90 });

    const resized = resizeMediaFromCorner(rotated, 'se', { dx: 0, dy: 100 });
    expect(resized.scale).toBe(1.5);
    expect(resized.rot).toBe(90);
  });
});
