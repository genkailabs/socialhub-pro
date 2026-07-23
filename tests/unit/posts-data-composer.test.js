import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import { getComposerPost } from '@/lib/posts-data';

describe('getComposerPost', () => {
  it('restores the serialized editor state for a scheduled post', async () => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'scheduled-1',
          status: 'scheduled',
          scheduled_at: '2026-07-25T20:00:00.000Z',
          production: {
            source: 'visual-composer',
            editorState: { format: 'reel', caption: 'Campanha' }
          }
        },
        error: null
      })
    };
    mocks.createClient.mockResolvedValue({ from: vi.fn(() => builder) });

    const result = await getComposerPost('brand-1', 'scheduled-1');

    expect(result).toEqual({
      id: 'scheduled-1',
      status: 'scheduled',
      scheduled_at: '2026-07-25T20:00:00.000Z',
      editor_state: { format: 'reel', caption: 'Campanha' }
    });
    expect(builder.in).toHaveBeenCalledWith('status', ['draft', 'scheduled']);
  });
});
