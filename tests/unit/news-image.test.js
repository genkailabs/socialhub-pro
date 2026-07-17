import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const modulePath = path.resolve('lib/ai/news-image.js');
const fallback = {
  buildNewsImagePrompt: () => '',
  titleAlignment: () => '',
  titleOverlayNeeded: () => false,
  pickPublishedImage: () => []
};
const newsImage = fs.existsSync(modulePath) ? await import(modulePath) : fallback;

describe('imagem de notícia', () => {
  it('cria um prompt visual ligado ao tema e sem texto', () => {
    const prompt = newsImage.buildNewsImagePrompt({
      topic: 'Vibe Coding',
      caption: 'IA mudou a programação',
      direction: 'moderno, luzes roxas',
      basePrompt: 'programador usando inteligência artificial em um estúdio moderno',
      variant: 2
    });

    expect(prompt).toContain('Vibe Coding');
    expect(prompt).toContain('moderno, luzes roxas');
    expect(prompt).toContain('programador usando inteligência artificial em um estúdio moderno');
    expect(prompt).toMatch(/no text|no letters/i);
    expect(prompt).toContain('variation 2');
  });

  it('converte a posição do título em alinhamento vertical', () => {
    expect(newsImage.titleAlignment('top')).toBe('flex-start');
    expect(newsImage.titleAlignment('center')).toBe('center');
    expect(newsImage.titleAlignment('bottom')).toBe('flex-end');
  });

  it('só cria camada de título quando ela foi ativada e preenchida', () => {
    expect(newsImage.titleOverlayNeeded({ textEnabled: false, title: 'Futebol hoje' })).toBe(false);
    expect(newsImage.titleOverlayNeeded({ textEnabled: true, title: '' })).toBe(false);
    expect(newsImage.titleOverlayNeeded({ textEnabled: true, title: 'Futebol hoje' })).toBe(true);
  });

  it('publica somente a opção de imagem selecionada', () => {
    expect(newsImage.pickPublishedImage({ selectedUrl: 'original.png', finalUrl: 'com-titulo.png' })).toEqual(['com-titulo.png']);
    expect(newsImage.pickPublishedImage({ selectedUrl: 'original.png', finalUrl: '' })).toEqual(['original.png']);
  });
});
