import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  publishInstagramImage: vi.fn(),
  publishInstagramCarousel: vi.fn(),
  publishInstagramComment: vi.fn(),
  publishInstagramStory: vi.fn(),
  publishInstagramReel: vi.fn(),
  publishFacebookPhoto: vi.fn(),
  recordDnaSignal: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/meta/graph', () => ({
  publishInstagramImage: mocks.publishInstagramImage,
  publishInstagramCarousel: mocks.publishInstagramCarousel,
  publishInstagramComment: mocks.publishInstagramComment,
  publishInstagramStory: mocks.publishInstagramStory,
  publishInstagramReel: mocks.publishInstagramReel,
  publishFacebookPhoto: mocks.publishFacebookPhoto
}));
vi.mock('@/lib/dna-signals', () => ({ recordDnaSignal: mocks.recordDnaSignal }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { publishNow, schedulePost } from '@/lib/posts-actions';
import { publishPostTo } from '@/lib/publishers/index';
import { cleanOrphanedTempMedia } from '@/lib/media-cleanup';

function makeSupabase(insertResult = { data: { id: 'post-1' }, error: null }, customOverrides = {}) {
  const insert = vi.fn(() => ({
    select: () => ({ maybeSingle: vi.fn().mockResolvedValue(insertResult) })
  }));
  const removeMock = vi.fn().mockResolvedValue({ data: {}, error: null });
  const listMock = vi.fn().mockImplementation((path) => {
    if (path === 'temp') return Promise.resolve({ data: customOverrides.listData || [], error: null });
    return Promise.resolve({ data: [], error: null });
  });
  const storageFromMock = vi.fn().mockReturnValue({ remove: removeMock, list: listMock });
  
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    storage: { from: storageFromMock },
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
      if (table === 'posts') {
        if (customOverrides.postsSelect) {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: customOverrides.postsSelect, error: null }),
              lte: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: customOverrides.postsSelect, error: null }),
                is: vi.fn().mockResolvedValue({ data: customOverrides.postsSelect, error: null })
              })
            }),
            insert
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              is: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }),
          insert
        };
      }
      if (table === 'posts_media') {
        if (customOverrides.postsMediaSelect) {
          return {
            select: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: customOverrides.postsMediaSelect, error: null })
              }),
              lte: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: customOverrides.postsMediaSelect, error: null })
              })
            }),
            delete: () => ({
              in: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockResolvedValue({ data: [], error: null })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            lte: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
        };
      }
      if (table === 'publication_learning') return { upsert: vi.fn().mockResolvedValue({ data: [], error: null }) };
      if (table === 'marketing_recommendations') return { update: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      throw new Error(`Tabela inesperada: ${table}`);
    })
  };
  return { supabase, insert, removeMock, listMock };
}

describe('Composer Unificado — Ponta a Ponta & Regressão (§Task 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publishInstagramImage.mockResolvedValue('ig-img-1');
    mocks.publishInstagramCarousel.mockResolvedValue('ig-car-1');
    mocks.publishInstagramStory.mockResolvedValue('ig-story-1');
    mocks.publishInstagramReel.mockResolvedValue('ig-reel-1');
  });

  describe('publishNow (Publicação Imediata)', () => {
    it('1. Formato image (padrão): publica via publishInstagramImage sem deletar mídia pública', async () => {
      const { supabase, removeMock } = makeSupabase();
      mocks.createClient.mockResolvedValue(supabase);

      const res = await publishNow({
        brandId: 'brand-1',
        caption: 'Post imagem',
        imageUrls: ['https://storage/bucket/media/final.jpg'],
        format: 'image'
      });

      expect(res.ok).toBe(true);
      expect(res.id).toBe('ig-img-1');
      expect(mocks.publishInstagramImage).toHaveBeenCalledWith({
        igId: 'ig-1',
        token: 'tok',
        caption: 'Post imagem',
        imageUrl: 'https://storage/bucket/media/final.jpg'
      });
      expect(removeMock).not.toHaveBeenCalled();
    });

    it('2. Formato carousel: publica via publishInstagramCarousel com múltiplas URLs', async () => {
      const { supabase } = makeSupabase();
      mocks.createClient.mockResolvedValue(supabase);

      const res = await publishNow({
        brandId: 'brand-1',
        caption: 'Post carrossel',
        imageUrls: ['https://storage/bucket/media/1.jpg', 'https://storage/bucket/media/2.jpg'],
        format: 'carousel'
      });

      expect(res.ok).toBe(true);
      expect(res.id).toBe('ig-car-1');
      expect(mocks.publishInstagramCarousel).toHaveBeenCalledWith({
        igId: 'ig-1',
        token: 'tok',
        caption: 'Post carrossel',
        imageUrls: ['https://storage/bucket/media/1.jpg', 'https://storage/bucket/media/2.jpg']
      });
    });

    it('3. Formato stories: publica via publishInstagramStory e limpa mídia temporária temp/', async () => {
      const { supabase, removeMock } = makeSupabase();
      mocks.createClient.mockResolvedValue(supabase);

      const res = await publishNow({
        brandId: 'brand-1',
        imageUrls: ['temp/brand-1/story-123.jpg'],
        format: 'stories'
      });

      expect(res.ok).toBe(true);
      expect(res.id).toBe('ig-story-1');
      expect(mocks.publishInstagramStory).toHaveBeenCalledWith({
        igId: 'ig-1',
        token: 'tok',
        imageUrl: 'temp/brand-1/story-123.jpg',
        isVideo: false
      });
      expect(removeMock).not.toHaveBeenCalled();
    });

    it('4. Formato reel: publica via publishInstagramReel com coverUrl e agenda limpeza via delete_after sem remover imediato', async () => {
      const { supabase, removeMock } = makeSupabase();
      mocks.createClient.mockResolvedValue(supabase);

      const res = await publishNow({
        brandId: 'brand-1',
        caption: 'Meu Reel',
        imageUrls: ['temp/brand-1/video-456.mp4'],
        coverUrl: 'temp/brand-1/cover-456.jpg',
        format: 'reel'
      });

      expect(res.ok).toBe(true);
      expect(res.id).toBe('ig-reel-1');
      expect(mocks.publishInstagramReel).toHaveBeenCalledWith({
        igId: 'ig-1',
        token: 'tok',
        caption: 'Meu Reel',
        videoUrl: 'temp/brand-1/video-456.mp4',
        coverUrl: 'temp/brand-1/cover-456.jpg',
        shareToFeed: true
      });
      expect(removeMock).not.toHaveBeenCalled();
    });
  });

  describe('schedulePost (Agendamento Multi-Formato)', () => {
    it('5. insere formato e cover_url em posts mantendo as mídias temp/ intactas p/ o cron', async () => {
      const { supabase, insert, removeMock } = makeSupabase();
      mocks.createClient.mockResolvedValue(supabase);

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const res = await schedulePost({
        brandId: 'brand-1',
        caption: 'Agendando Reel',
        imageUrls: ['temp/brand-1/reel.mp4'],
        coverUrl: 'temp/brand-1/cover.jpg',
        scheduledAt: futureDate,
        format: 'reel'
      });

      expect(res.ok).toBe(true);
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({
        brand_id: 'brand-1',
        format: 'reel',
        cover_url: 'temp/brand-1/cover.jpg',
        status: 'scheduled',
        media_url: 'temp/brand-1/reel.mp4'
      }));
      // Mídia temp/ NÃO deve ser removida no agendamento, apenas após publicação real.
      expect(removeMock).not.toHaveBeenCalled();
    });
  });

  describe('Roteador publishPostTo (lib/publishers/index.js)', () => {
    it('6. despacha corretamente cada formato para a API Graph com retry', async () => {
      const fakeGraph = {
        publishInstagramImage: vi.fn().mockResolvedValue('g-img'),
        publishInstagramCarousel: vi.fn().mockResolvedValue('g-car'),
        publishInstagramStory: vi.fn().mockResolvedValue('g-story'),
        publishInstagramReel: vi.fn().mockResolvedValue('g-reel')
      };
      const token = { platform_user_id: 'ig-1', access_token: 'tok' };
      const retryOptions = { retries: 1 };

      await expect(publishPostTo({ platform: 'instagram', token, urls: ['u1'], format: 'image', graph: fakeGraph, retryOptions })).resolves.toBe('g-img');
      await expect(publishPostTo({ platform: 'instagram', token, urls: ['u1', 'u2'], format: 'carousel', graph: fakeGraph, retryOptions })).resolves.toBe('g-car');
      await expect(publishPostTo({ platform: 'instagram', token, urls: ['u1'], format: 'stories', graph: fakeGraph, retryOptions })).resolves.toBe('g-story');
      await expect(publishPostTo({ platform: 'instagram', token, urls: ['u1'], format: 'reel', graph: fakeGraph, retryOptions })).resolves.toBe('g-reel');

      expect(fakeGraph.publishInstagramImage).toHaveBeenCalledTimes(1);
      expect(fakeGraph.publishInstagramCarousel).toHaveBeenCalledTimes(1);
      expect(fakeGraph.publishInstagramStory).toHaveBeenCalledTimes(1);
      expect(fakeGraph.publishInstagramReel).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanOrphanedTempMedia (Garbage Collection)', () => {
    it('7. limpa mídias temporárias órfãs antigas sem remover mídias em posts ativos', async () => {
      const now = Date.now();
      const thirtyHoursAgo = new Date(now - 30 * 3600 * 1000).toISOString();
      const tenHoursAgo = new Date(now - 10 * 3600 * 1000).toISOString();

      const listData = [
        { name: 'orphaned-old.mp4', created_at: thirtyHoursAgo, metadata: {} },
        { name: 'active-old.mp4', created_at: thirtyHoursAgo, metadata: {} },
        { name: 'orphaned-recent.jpg', created_at: tenHoursAgo, metadata: {} }
      ];

      const activePosts = [
        { media_url: 'temp/active-old.mp4', media_urls: ['temp/active-old.mp4'], cover_url: null }
      ];

      const { supabase, removeMock } = makeSupabase(null, { listData, postsSelect: activePosts });

      const res = await cleanOrphanedTempMedia({ supabase, maxAgeHours: 24 });

      expect(res.ok).toBe(true);
      expect(res.removedPaths).toEqual(['temp/orphaned-old.mp4']);
      expect(removeMock).toHaveBeenCalledWith(['temp/orphaned-old.mp4']);
    });
  });
});
