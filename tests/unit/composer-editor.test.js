import { describe, expect, it } from 'vitest';
import {
  addLayer, canvasSize, getSurface, makeComposerDocument, serializeComposer,
  snapPosition, toApiFormat, validateComposer
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
    expect(canvasSize('post', '1.91:1')).toEqual([600, 314]);
    expect(canvasSize('story')).toEqual([292, 519]);
    expect(toApiFormat('carrossel')).toBe('carousel');
    expect(toApiFormat('story')).toBe('stories');
  });

  it('faz snap no centro e nas margens com guias objetivas', () => {
    expect(snapPosition({ x: 161, y: 190, w: 100, h: 50, canvas: [430, 430] })).toMatchObject({
      x: 165, y: 190, guideV: true, guideH: true
    });
    expect(snapPosition({ x: 27, y: 27, w: 80, h: 40, canvas: [430, 430] })).toMatchObject({
      x: 24, y: 24
    });
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
});
