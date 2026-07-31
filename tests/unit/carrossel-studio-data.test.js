import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import { getLatestStudioDraft } from '@/lib/carrossel-studio-data';

describe('getLatestStudioDraft', () => {
  it('busca apenas o último rascunho do Studio e devolve documento e mídias', async () => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      contains: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'studio-draft-1',
          media_urls: ['https://cdn.test/slide-1.png'],
          production: {
            source: 'carrossel-studio',
            editorState: {
              doc: { name: 'Checklist' },
              editorial: { approvedAt: '2026-07-30T00:00:00.000Z', sources: [{ id: 'source-1' }] }
            }
          }
        },
        error: null
      })
    };
    mocks.createClient.mockResolvedValue({ from: vi.fn(() => builder) });

    await expect(getLatestStudioDraft('brand-1')).resolves.toEqual({
      id: 'studio-draft-1',
      doc: { name: 'Checklist' },
      mediaUrls: ['https://cdn.test/slide-1.png'],
      editorial: { approvedAt: '2026-07-30T00:00:00.000Z', sources: [{ id: 'source-1' }] }
    });
    expect(builder.contains).toHaveBeenCalledWith('production', { source: 'carrossel-studio' });
  });
});
