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

import { deleteComposerDraft, publishNow, schedulePost } from '@/lib/posts-actions';

function makeSupabase() {
  const remove = vi.fn().mockResolvedValue({ data: [{ name: 'arquivo.jpg' }], error: null });
  const updates = [];
  const deletes = [];

  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    storage: { from: vi.fn(() => ({ remove })) },
    from: vi.fn((table) => {
      const state = { operation: null, filters: [] };
      const builder = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => {
          state.operation = 'insert';
          return builder;
        }),
        update: vi.fn((data) => {
          state.operation = 'update';
          updates.push({ table, data });
          return builder;
        }),
        delete: vi.fn(() => {
          state.operation = 'delete';
          deletes.push(table);
          return builder;
        }),
        eq: vi.fn((column, value) => {
          state.filters.push([column, value]);
          return builder;
        }),
        in: vi.fn((column, value) => {
          state.filters.push([column, value]);
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          if (table === 'social_tokens') {
            return { data: { access_token: 'tok', platform_user_id: 'ig-1' }, error: null };
          }
          if (table === 'posts' && ['insert', 'update'].includes(state.operation)) {
            return { data: { id: 'post-1' }, error: null };
          }
          if (table === 'posts') {
            return {
              data: {
                id: 'draft-1',
                status: 'draft',
                media_url: 'temp/brand-1/arquivo.jpg',
                media_urls: ['temp/brand-1/arquivo.jpg'],
                cover_url: null,
                cover_storage_path: null
              },
              error: null
            };
          }
          return { data: null, error: null };
        }),
        single: vi.fn(async () => ({ data: { id: 'post-1' }, error: null })),
        then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject)
      };
      return builder;
    })
  };

  return { supabase, remove, updates, deletes };
}

describe('Composer media lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publishInstagramImage.mockResolvedValue('ig-media-1');
  });

  it('removes temporary media and clears file references after Instagram confirms publication', async () => {
    const { supabase, remove, updates } = makeSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    const result = await publishNow({
      brandId: 'brand-1',
      caption: 'Post temporário',
      imageUrls: ['https://supa.test/storage/v1/object/public/media/temp/brand-1/arquivo.jpg']
    });

    expect(result).toEqual({ ok: true, id: 'ig-media-1' });
    expect(remove).toHaveBeenCalledWith(['temp/brand-1/arquivo.jpg']);
    expect(updates).toContainEqual({
      table: 'posts',
      data: expect.objectContaining({
        media_url: null,
        media_urls: [],
        cover_url: null,
        cover_storage_path: null,
        production: null,
        delete_after: null
      })
    });
  });

  it('publishes an existing draft in place before clearing its temporary references', async () => {
    const { supabase, updates } = makeSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    const result = await publishNow({
      brandId: 'brand-1',
      draftId: 'draft-1',
      caption: 'Publicar rascunho',
      imageUrls: ['temp/brand-1/arquivo.jpg']
    });

    expect(result).toEqual({ ok: true, id: 'ig-media-1' });
    expect(updates).toContainEqual({
      table: 'posts',
      data: expect.objectContaining({
        status: 'published',
        external_post_id: 'ig-media-1'
      })
    });
  });

  it('deletes draft media immediately before removing the draft records', async () => {
    const { supabase, remove, deletes } = makeSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    const result = await deleteComposerDraft({ brandId: 'brand-1', draftId: 'draft-1' });

    expect(result).toEqual({ ok: true });
    expect(remove).toHaveBeenCalledWith(['temp/brand-1/arquivo.jpg']);
    expect(deletes).toEqual(['posts_media', 'posts']);
  });

  it('turns an existing draft into a scheduled post without duplicating or deleting its media', async () => {
    const { supabase, remove, updates } = makeSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    const result = await schedulePost({
      brandId: 'brand-1',
      draftId: 'draft-1',
      caption: 'Agendado',
      imageUrls: ['temp/brand-1/arquivo.jpg'],
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    });

    expect(result).toEqual({ ok: true, id: 'post-1' });
    expect(updates).toContainEqual({
      table: 'posts',
      data: expect.objectContaining({
        status: 'scheduled',
        media_url: 'temp/brand-1/arquivo.jpg'
      })
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
