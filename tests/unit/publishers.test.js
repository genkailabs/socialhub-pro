import { describe, expect, it, vi } from 'vitest';
import {
  withRetry,
  isTransientError,
  publishPostTo,
  publishableNetworks,
  mediaUrlsOf,
  canPublishPlatform
} from '@/lib/publishers';

const noSleep = () => Promise.resolve();
const igToken = { platform_user_id: 'ig1', access_token: 'tok' };
const fbToken = { platform_user_id: 'pg1', access_token: 'tok' };

function fakeGraph() {
  return {
    publishInstagramImage: vi.fn().mockResolvedValue('img-1'),
    publishInstagramCarousel: vi.fn().mockResolvedValue('car-1'),
    publishInstagramStory: vi.fn((args) => Promise.resolve(`story-${args.videoUrl || args.imageUrl}`)),
    publishInstagramReel: vi.fn().mockResolvedValue('reel-1'),
    publishFacebookPhoto: vi.fn().mockResolvedValue('fb-1')
  };
}

describe('classificação de erro transitório', () => {
  it('trata rede/timeout/limite como transitório', () => {
    expect(isTransientError(new Error('fetch failed'))).toBe(true);
    expect(isTransientError(new Error('rate limit exceeded (429)'))).toBe(true);
    expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
  });
  it('não retenta erro definitivo', () => {
    expect(isTransientError(new Error('Publicação: mídia inválida'))).toBe(false);
    expect(isTransientError(new Error('sem permissão'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('retorna no primeiro sucesso sem retentar', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retenta falha transitória até vencer', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { retries: 2, sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('desiste após esgotar as tentativas', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('timeout'));
    await expect(withRetry(fn, { retries: 2, sleep: noSleep })).rejects.toThrow('timeout');
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it('não retenta erro definitivo', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('mídia inválida'));
    await expect(withRetry(fn, { retries: 3, sleep: noSleep })).rejects.toThrow('mídia inválida');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('publishPostTo', () => {
  const retryOptions = { sleep: noSleep };

  it('publica imagem única no instagram', async () => {
    const graph = fakeGraph();
    const id = await publishPostTo({ platform: 'instagram', token: igToken, caption: 'oi', urls: ['u1'], graph, retryOptions });
    expect(id).toBe('img-1');
    expect(graph.publishInstagramImage).toHaveBeenCalledWith({ igId: 'ig1', token: 'tok', caption: 'oi', imageUrl: 'u1' });
    expect(graph.publishInstagramCarousel).not.toHaveBeenCalled();
  });

  it('publica carrossel quando há várias urls', async () => {
    const graph = fakeGraph();
    const id = await publishPostTo({ platform: 'instagram', token: igToken, caption: 'c', urls: ['u1', 'u2'], graph, retryOptions });
    expect(id).toBe('car-1');
    expect(graph.publishInstagramCarousel).toHaveBeenCalledWith({ igId: 'ig1', token: 'tok', caption: 'c', imageUrls: ['u1', 'u2'] });
  });

  it('publica foto no facebook', async () => {
    const graph = fakeGraph();
    const id = await publishPostTo({ platform: 'facebook', token: fbToken, caption: 'm', urls: ['u1'], graph, retryOptions });
    expect(id).toBe('fb-1');
    expect(graph.publishFacebookPhoto).toHaveBeenCalledWith({ pageId: 'pg1', pageToken: 'tok', message: 'm', imageUrl: 'u1' });
  });

  // MVP V2: Story é sequência de artes verticais, uma publicação por card.
  it('publica cada card do story separadamente, na ordem', async () => {
    const graph = fakeGraph();
    const id = await publishPostTo({ platform: 'instagram', token: igToken, urls: ['u1', 'u2', 'u3'], format: 'stories', graph, retryOptions });

    expect(graph.publishInstagramStory).toHaveBeenCalledTimes(3);
    expect(graph.publishInstagramStory.mock.calls.map((c) => c[0].imageUrl)).toEqual(['u1', 'u2', 'u3']);
    // O id devolvido é o do card que abre a sequência.
    expect(id).toBe('story-u1');
  });

  it('publica stories em vídeo corretamente', async () => {
    const graph = fakeGraph();
    const id = await publishPostTo({ platform: 'instagram', token: igToken, urls: ['u1.mp4', 'u2.jpg'], format: 'stories', graph, retryOptions });
    expect(graph.publishInstagramStory).toHaveBeenCalledTimes(2);
    expect(graph.publishInstagramStory.mock.calls[0][0].videoUrl).toBe('u1.mp4');
    expect(graph.publishInstagramStory.mock.calls[0][0].isVideo).toBe(true);
    expect(graph.publishInstagramStory.mock.calls[1][0].imageUrl).toBe('u2.jpg');
    expect(id).toBe('story-u1.mp4');
  });

  it('publica reel corretamente', async () => {
    const graph = fakeGraph();
    const id = await publishPostTo({ platform: 'instagram', token: igToken, caption: 'my reel', urls: ['video.mp4'], format: 'reel', graph, retryOptions });
    expect(id).toBe('reel-1');
    expect(graph.publishInstagramReel).toHaveBeenCalledWith({ igId: 'ig1', token: 'tok', videoUrl: 'video.mp4', caption: 'my reel' });
  });

  // Mandar a sequência como carrossel colocaria o Story no feed.
  it('story nunca vira carrossel nem imagem de feed', async () => {
    const graph = fakeGraph();
    await publishPostTo({ platform: 'instagram', token: igToken, urls: ['u1', 'u2'], format: 'stories', graph, retryOptions });

    expect(graph.publishInstagramCarousel).not.toHaveBeenCalled();
    expect(graph.publishInstagramImage).not.toHaveBeenCalled();
  });

  it('story não publica no facebook', async () => {
    const graph = fakeGraph();
    await expect(publishPostTo({ platform: 'facebook', token: fbToken, urls: ['u1'], format: 'stories', graph, retryOptions }))
      .rejects.toThrow(/so publica no Instagram/i);
    expect(graph.publishFacebookPhoto).not.toHaveBeenCalled();
  });

  it('recusa formato não publicável (§5.1)', async () => {
    const graph = fakeGraph();
    await expect(publishPostTo({ platform: 'instagram', token: igToken, urls: ['u1'], format: 'unknown_format', graph, retryOptions }))
      .rejects.toThrow(/nao publicavel/i);
    expect(graph.publishInstagramImage).not.toHaveBeenCalled();
  });

  it('aceita formato publicável explícito', async () => {
    const graph = fakeGraph();
    await expect(publishPostTo({ platform: 'instagram', token: igToken, urls: ['u1'], format: 'image', graph, retryOptions }))
      .resolves.toBe('img-1');
  });

  it('falha sem token', async () => {
    await expect(publishPostTo({ platform: 'instagram', token: null, urls: ['u1'], graph: fakeGraph(), retryOptions }))
      .rejects.toThrow(/sem token/i);
  });

  it('falha sem mídia', async () => {
    await expect(publishPostTo({ platform: 'instagram', token: igToken, urls: [], graph: fakeGraph(), retryOptions }))
      .rejects.toThrow(/sem midia/i);
  });

  it('rejeita plataforma sem publicador', async () => {
    await expect(publishPostTo({ platform: 'tiktok', token: igToken, urls: ['u1'], graph: fakeGraph(), retryOptions }))
      .rejects.toThrow(/sem publicador/i);
  });

  it('retenta falha transitória da Graph antes de vencer', async () => {
    const graph = fakeGraph();
    graph.publishInstagramImage
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValue('img-2');
    const id = await publishPostTo({ platform: 'instagram', token: igToken, urls: ['u1'], graph, retryOptions });
    expect(id).toBe('img-2');
    expect(graph.publishInstagramImage).toHaveBeenCalledTimes(2);
  });
});

describe('helpers da fila', () => {
  it('publishableNetworks filtra o que sabemos publicar', () => {
    expect(publishableNetworks({ networks: ['instagram', 'facebook', 'tiktok'] })).toEqual(['instagram', 'facebook']);
  });
  it('publishableNetworks assume instagram por padrão', () => {
    expect(publishableNetworks({})).toEqual(['instagram']);
    expect(publishableNetworks({ networks: [] })).toEqual(['instagram']);
  });
  it('mediaUrlsOf prefere media_urls, cai para media_url', () => {
    expect(mediaUrlsOf({ media_urls: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(mediaUrlsOf({ media_url: 'x' })).toEqual(['x']);
    expect(mediaUrlsOf({})).toEqual([]);
  });
  it('canPublishPlatform conhece instagram e facebook', () => {
    expect(canPublishPlatform('instagram')).toBe(true);
    expect(canPublishPlatform('facebook')).toBe(true);
    expect(canPublishPlatform('tiktok')).toBe(false);
  });
});
