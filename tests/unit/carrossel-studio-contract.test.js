import { describe, expect, it } from 'vitest';
import {
  CAROUSEL_STUDIO_PROTOCOL_VERSION,
  isStudioMessage,
  isStudioReady,
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
      script: 'texto'
    });
    expect(init).toMatchObject({ type: 'cs:init', version: CAROUSEL_STUDIO_PROTOCOL_VERSION, channelId, title: 'Roteiro', doc: { slides: [] } });
    expect(init.slideCount).toBeUndefined();
  });

  it('aceita apenas ready versionado e mensagens do canal atual', () => {
    expect(isStudioReady({ type: 'cs:ready', version: 1 })).toBe(true);
    expect(isStudioReady({ type: 'cs:ready', version: 2 })).toBe(false);
    expect(isStudioMessage({ type: 'cs:change', version: 1, channelId, doc: { slides: [] } }, channelId)).toBe(true);
    expect(isStudioMessage({ type: 'cs:change', version: 1, channelId: 'cs-other', doc: { slides: [] } }, channelId)).toBe(false);
    expect(isStudioMessage({ type: 'cs:export', version: 1, channelId, doc: {}, images: [{ name: 'a.png', dataUrl: 'data:image/png;base64,AA==' }] }, channelId)).toBe(true);
  });

  it('resolve somente origens HTTP(S) válidas para o iframe', () => {
    expect(studioOrigin('https://studio.example.com/embed-studio')).toBe('https://studio.example.com');
    expect(studioOrigin('ftp://studio.example.com/embed-studio')).toBeNull();
    expect(studioOrigin('not a url')).toBeNull();
  });
});
