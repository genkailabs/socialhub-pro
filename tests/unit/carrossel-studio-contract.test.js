import { describe, expect, it } from 'vitest';
import {
  CAROUSEL_STUDIO_PROTOCOL_VERSION,
  isStudioMessage,
  isStudioReady,
  safeStudioImageHints,
  safeStudioInitialMedia,
  studioMediaMessage,
  studioMediaDeleteAckMessage,
  studioImageHintsMessage,
  studioInitMessage,
  studioOrigin
} from '@/lib/carrossel-studio-contract';

describe('Carrossel Studio bridge contract V1', () => {
  const channelId = 'cs-test-channel';

  it('monta init versionado e limita dados enviados ao iframe', () => {
    const init = studioInitMessage({
      channelId,
      title: 'Roteiro',
      doc: { slides: [] },
      slideCount: 99,
      script: 'texto',
      initialMedia: [
        { url: 'https://cdn.test/slide-3.png', path: 'temp/brand-1/slide-3.png', altText: 'Exemplo do slide 3', slideOrder: 3, secret: 'nao enviar' },
        { url: 'javascript:alert(1)', path: '../segredo' }
      ]
    });
    expect(init).toMatchObject({ type: 'cs:init', version: CAROUSEL_STUDIO_PROTOCOL_VERSION, channelId, title: 'Roteiro', doc: { slides: [] } });
    expect(init.slideCount).toBeUndefined();
    expect(init.media).toEqual([{
      url: 'https://cdn.test/slide-3.png',
      path: 'temp/brand-1/slide-3.png',
      altText: 'Exemplo do slide 3',
      slot: 2,
      kind: 'image'
    }]);
  });

  it('aceita somente URLs web e paths temporarios seguros na midia inicial', () => {
    expect(safeStudioInitialMedia([
      { url: 'http://localhost:54321/storage/image.png', path: 'temp/brand/image.png', altText: '  Imagem segura  ', slideOrder: 9 },
      { url: 'data:image/png;base64,AA==' },
      { url: 'https://cdn.test/b.png', path: 'temp/brand/../private.png' }
    ])).toEqual([
      { url: 'http://localhost:54321/storage/image.png', path: 'temp/brand/image.png', altText: 'Imagem segura', kind: 'image', slot: 8 },
      { url: 'https://cdn.test/b.png', kind: 'image' }
    ]);
  });

  it('aceita apenas ready versionado e mensagens do canal atual', () => {
    expect(isStudioReady({ type: 'cs:ready', version: 1 })).toBe(true);
    expect(isStudioReady({ type: 'cs:ready', version: 2 })).toBe(false);
    expect(isStudioMessage({ type: 'cs:change', version: 1, channelId, doc: { slides: [] } }, channelId)).toBe(true);
    expect(isStudioMessage({ type: 'cs:change', version: 1, channelId: 'cs-other', doc: { slides: [] } }, channelId)).toBe(false);
    expect(isStudioMessage({ type: 'cs:export', version: 1, channelId, doc: {}, images: [{ name: 'a.png', dataUrl: 'data:image/png;base64,AA==' }] }, channelId)).toBe(true);
  });

  it('valida upload binario do Studio e monta a resposta com URL e path', () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const request = {
      type: 'cs:media-request',
      version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
      channelId,
      requestId: 'media-request-1',
      file: { name: 'foto.png', type: 'image/png', size: bytes.byteLength, bytes }
    };

    expect(isStudioMessage(request, channelId)).toBe(true);
    expect(isStudioMessage({ ...request, channelId: 'cs-other' }, channelId)).toBe(false);
    expect(isStudioMessage({ ...request, file: { ...request.file, size: 4 } }, channelId)).toBe(false);
    expect(studioMediaMessage({
      channelId,
      requestId: request.requestId,
      item: { url: 'https://cdn.test/foto.png', path: 'temp/brand/foto.png', kind: 'image', name: 'foto.png' }
    })).toEqual({
      type: 'cs:media',
      version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
      channelId,
      requestId: request.requestId,
      items: [{ url: 'https://cdn.test/foto.png', path: 'temp/brand/foto.png', kind: 'image', name: 'foto.png' }]
    });
  });

  it('aceita artefatos Motion limitados e confirma exclusao temporaria pelo requestId', () => {
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const upload = {
      type: 'cs:media-request', version: 1, channelId, requestId: 'motion-upload-1',
      file: { name: 'reels.webm', type: 'video/webm', size: bytes.byteLength, bytes }
    };
    const deletion = {
      type: 'cs:media-delete-request', version: 1, channelId, requestId: 'motion-delete-1',
      path: 'temp/brand-1/reels.webm'
    };

    expect(isStudioMessage(upload, channelId)).toBe(true);
    expect(isStudioMessage({ ...upload, file: { ...upload.file, type: 'text/html' } }, channelId)).toBe(false);
    expect(isStudioMessage(deletion, channelId)).toBe(true);
    expect(isStudioMessage({ ...deletion, path: 'temp/brand-1/../secret' }, channelId)).toBe(false);
    expect(studioMediaDeleteAckMessage({ channelId, requestId: deletion.requestId, path: deletion.path })).toEqual({
      type: 'cs:media-delete-ack', version: 1, channelId, requestId: deletion.requestId, path: deletion.path
    });
  });

  it('aceita a seleção feita dentro do Studio e recusa índice ou slot fora da faixa', () => {
    const selecao = { type: 'cs:selection', version: 1, channelId, slideIndex: 2, elementId: 'el-9', elementType: 'image', slot: 3 };

    expect(isStudioMessage(selecao, channelId)).toBe(true);
    expect(isStudioMessage({ ...selecao, elementId: null, elementType: null, slot: undefined }, channelId)).toBe(true);
    expect(isStudioMessage({ ...selecao, slot: 9 }, channelId)).toBe(false);
    expect(isStudioMessage({ ...selecao, slideIndex: -1 }, channelId)).toBe(false);
    expect(isStudioMessage({ ...selecao, slideIndex: 1.5 }, channelId)).toBe(false);
    expect(isStudioMessage({ ...selecao, channelId: 'cs-other' }, channelId)).toBe(false);
  });

  it('resolve somente origens HTTP(S) válidas para o iframe', () => {
    expect(studioOrigin('https://studio.example.com/embed-studio')).toBe('https://studio.example.com');
    expect(studioOrigin('ftp://studio.example.com/embed-studio')).toBeNull();
    expect(studioOrigin('not a url')).toBeNull();
  });
});

describe('dicas de foto na ponte', () => {
  const channelId = 'cs-test-channel';

  it('recorta a dica e descarta a que não tem cena ou número de slide', () => {
    const hints = safeStudioImageHints([
      { order: 1, headline: 'Capa', scene: 'mesa com café', query: 'coffee desk', queryPt: 'mesa café', avoid: 'foto com texto' },
      { order: 0, scene: 'fora da faixa' },
      { order: 2, scene: '   ' },
      { order: 3, scene: 'x'.repeat(500), query: 'y'.repeat(500) },
      'não é objeto'
    ]);

    expect(hints).toHaveLength(2);
    expect(hints[0]).toEqual({
      order: 1,
      scene: 'mesa com café',
      query: 'coffee desk',
      headline: 'Capa',
      queryPt: 'mesa café',
      avoid: 'foto com texto'
    });
    expect(hints[1].scene).toHaveLength(400);
    expect(hints[1].query).toHaveLength(300);
  });

  it('monta a mensagem versionada de atualização das dicas', () => {
    const mensagem = studioImageHintsMessage({
      channelId,
      hints: [{ order: 1, scene: 'cena', query: 'scene' }]
    });

    expect(mensagem).toEqual({
      type: 'cs:image-hints',
      version: CAROUSEL_STUDIO_PROTOCOL_VERSION,
      channelId,
      hints: [{ order: 1, scene: 'cena', query: 'scene' }]
    });
  });

  it('leva as dicas no init e omite o campo quando não há nenhuma', () => {
    const comDica = studioInitMessage({ channelId, imageHints: [{ order: 2, scene: 'cena', query: 'scene' }] });
    const semDica = studioInitMessage({ channelId });

    expect(comDica.imageHints).toEqual([{ order: 2, scene: 'cena', query: 'scene' }]);
    expect(semDica.imageHints).toBeUndefined();
  });
});
