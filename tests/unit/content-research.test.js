import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ researchContext: vi.fn() }));

vi.mock('@/lib/ai/research', () => ({ researchContext: mocks.researchContext }));

import { validateContentSources } from '@/lib/content-source-contract';
import { researchForOpportunity } from '@/lib/content-research';

const source = {
  url: 'https://example.com/report?utm_source=test',
  title: '  Relatorio confiavel  ',
  publisher: 'Example News',
  publishedAt: '2026-07-20T10:00:00.000Z',
  consultedAt: '2026-07-26T10:00:00.000Z',
  summary: '  Resumo verificavel.  '
};

describe('content source contract', () => {
  it('rejects a factual source with an invalid URL', () => {
    expect(validateContentSources({ sources: [{ ...source, url: 'nota-url' }] })).toMatchObject({ ok: false, reason: 'invalid-source-url' });
  });

  it('rejects a factual source without a publication date', () => {
    expect(validateContentSources({ sources: [{ ...source, publishedAt: '' }] })).toMatchObject({ ok: false, reason: 'missing-source-published-at' });
  });

  it('rejects an external image without a license', () => {
    expect(validateContentSources({ sources: [source], images: [{ imageUrl: 'https://images.example.com/photo.jpg', sourceUrl: source.url, author: 'Ana', source: 'Example Images' }] }))
      .toMatchObject({ ok: false, reason: 'missing-image-license' });
  });

  it('rejects duplicate factual source URLs after normalization', () => {
    expect(validateContentSources({ sources: [source, { ...source, url: 'https://EXAMPLE.com/report?utm_source=other' }] }))
      .toMatchObject({ ok: false, reason: 'duplicate-source-url' });
  });
});

describe('researchForOpportunity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a clear unavailable outcome when provider research lacks provenance', async () => {
    mocks.researchContext.mockResolvedValue({ summary: 'Pesquisa sem metadados.', sources: [{
      url: 'https://example.com', title: 'Sem data', publisher: 'Example', consultedAt: '2026-07-26T10:00:00.000Z', summary: 'Resumo sem data.'
    }] });

    await expect(researchForOpportunity({ opportunity: { topic: 'Tema', objective: 'educar', format: 'Post' }, kit: {}, supabase: {} }))
      .resolves.toMatchObject({ status: 'unavailable', reason: 'missing-source-published-at', research: null });
  });
});
