import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  publishInstagramImage: vi.fn(),
  publishInstagramCarousel: vi.fn(),
  publishInstagramComment: vi.fn(),
  publishInstagramStory: vi.fn(),
  publishInstagramReel: vi.fn(),
  recordDnaSignal: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/meta/graph', () => ({
  publishInstagramImage: mocks.publishInstagramImage,
  publishInstagramCarousel: mocks.publishInstagramCarousel,
  publishInstagramComment: mocks.publishInstagramComment,
  publishInstagramStory: mocks.publishInstagramStory,
  publishInstagramReel: mocks.publishInstagramReel
}));
vi.mock('@/lib/dna-signals', () => ({ recordDnaSignal: mocks.recordDnaSignal }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { publishNow } from '@/lib/posts-actions';

// Monta um supabase falso onde o insert em posts resolve com o que o teste pedir.
function makeSupabase(insertResult) {
  const insert = vi.fn(() => ({
    select: () => ({ maybeSingle: vi.fn().mockResolvedValue(insertResult) })
  }));
    const removeMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    const storageFromMock = vi.fn().mockReturnValue({ remove: removeMock });
    const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    storage: {
      from: storageFromMock
    },
    from: vi.fn((table) => {
      if (table === 'social_tokens') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { access_token: 'tok', platform_user_id: 'ig-1' }
                  })
                })
              })
            })
          })
        };
      }
      if (table === 'posts') return { insert };
      throw new Error(`Tabela inesperada: ${table}`);
    })
  };
  return { supabase, insert };
}

const payload = { brandId: 'brand-1', caption: 'Oi', hashtags: '#a', imageUrls: ['https://img/1.png'] };

describe('publishNow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publishInstagramImage.mockResolvedValue('ig-media-1');
  });

  it('registra o post e confirma a publicação', async () => {
    const { supabase, insert } = makeSupabase({ data: { id: 'post-1' }, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    const res = await publishNow(payload);

    expect(res).toEqual({ ok: true, id: 'ig-media-1' });
    expect(res.warning).toBeUndefined();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      media_url: 'https://img/1.png',
      media_urls: ['https://img/1.png'],
      status: 'published'
    });
  });

  // Regressão: a coluna posts.media_urls não existia no banco, o insert falhava
  // com 42703 e o erro era descartado — o post ia ao ar e sumia do calendário.
  it('avisa quando o post foi publicado mas não pôde ser registrado', async () => {
    const { supabase } = makeSupabase({
      data: null,
      error: { message: 'column posts.media_urls does not exist' }
    });
    mocks.createClient.mockResolvedValue(supabase);

    const res = await publishNow(payload);

    // Publicou de verdade: não pode virar erro do fluxo.
    expect(res.ok).toBe(true);
    expect(res.id).toBe('ig-media-1');
    expect(res.error).toBeUndefined();
    // Mas o usuário precisa saber que o registro falhou.
    expect(res.warning).toContain('não foi possível registrar');
    expect(res.warning).toContain('column posts.media_urls does not exist');
  });

  it('publica stories (vídeo) e remove do bucket temporário', async () => {
    const { supabase, insert } = makeSupabase({ data: { id: 'post-story' }, error: null });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.publishInstagramStory.mockResolvedValue('ig-story-1');

    const res = await publishNow({
      ...payload,
      format: 'stories',
      imageUrls: ['temp/brand-1/123.mp4']
    });

    expect(res).toEqual({ ok: true, id: 'ig-story-1' });
    expect(mocks.publishInstagramStory).toHaveBeenCalledWith(expect.objectContaining({
      isVideo: true,
      imageUrl: 'temp/brand-1/123.mp4'
    }));
    
    expect(supabase.storage.from).toHaveBeenCalledWith('media');
    const storageMock = supabase.storage.from('media');
    expect(storageMock.remove).toHaveBeenCalledWith(['temp/brand-1/123.mp4']);
    
    expect(insert.mock.calls[0][0]).toMatchObject({
      format: 'stories',
      media_url: 'temp/brand-1/123.mp4'
    });
  });

  it('normaliza formatos como "story" ou "STORIES" para "stories" ao publicar', async () => {
    const { supabase, insert } = makeSupabase({ data: { id: 'post-story-2' }, error: null });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.publishInstagramStory.mockResolvedValue('ig-story-2');

    const res = await publishNow({
      ...payload,
      format: 'STORIES',
      imageUrls: ['https://img/story.jpg']
    });

    expect(res).toEqual({ ok: true, id: 'ig-story-2' });
    expect(mocks.publishInstagramStory).toHaveBeenCalled();
    expect(insert.mock.calls[0][0]).toMatchObject({
      format: 'stories'
    });
  });

  it('publica reel com cover_url e limpa ambos arquivos temporarios', async () => {
    const { supabase, insert } = makeSupabase({ data: { id: 'post-reel' }, error: null });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.publishInstagramReel.mockResolvedValue('ig-reel-1');

    const res = await publishNow({
      ...payload,
      format: 'reel',
      imageUrls: ['temp/brand-1/video.mp4'],
      coverUrl: 'temp/brand-1/cover.jpg'
    });

    expect(res).toEqual({ ok: true, id: 'ig-reel-1' });
    expect(mocks.publishInstagramReel).toHaveBeenCalledWith(expect.objectContaining({
      videoUrl: 'temp/brand-1/video.mp4',
      coverUrl: 'temp/brand-1/cover.jpg'
    }));
    
    expect(supabase.storage.from).toHaveBeenCalledWith('media');
    const storageMock = supabase.storage.from('media');
    expect(storageMock.remove).toHaveBeenCalledWith(['temp/brand-1/video.mp4']);
    expect(storageMock.remove).toHaveBeenCalledWith(['temp/brand-1/cover.jpg']);
    
    expect(insert.mock.calls[0][0]).toMatchObject({
      format: 'reel',
      media_url: 'temp/brand-1/video.mp4',
      cover_url: 'temp/brand-1/cover.jpg'
    });
  });
});
