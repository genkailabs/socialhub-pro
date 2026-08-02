import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createTrendsResearchCacheClient: vi.fn(),
  researchContext: vi.fn(),
  runSkill: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/instagram-trends-cache', () => ({
  createTrendsResearchCacheClient: mocks.createTrendsResearchCacheClient
}));
vi.mock('@/lib/ai/research', () => ({
  ResearchUnavailableError: class ResearchUnavailableError extends Error {},
  researchContext: mocks.researchContext
}));
vi.mock('@/lib/ai/skills/run', () => ({ runSkill: mocks.runSkill }));

import { POST } from '@/app/api/trends/route';

const BRAND_ID = '123e4567-e89b-42d3-a456-426614174000';

function query(result) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result)
  };
}

function trend(index) {
  return {
    title: `Padrão ${index}`,
    summary: 'Resumo qualitativo.',
    category: 'educacao',
    profession: 'geral',
    format: 'carrossel',
    status: 'acompanhar',
    priority: 'adaptar',
    mechanic: 'Mecânica editorial.',
    howTo: 'Como executar.',
    carouselTheme: 'Tema original',
    carouselPrompt: 'Crie uma sequência original.',
    sourceIds: ['source-1']
  };
}

describe('POST /api/trends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const brandQuery = query({ data: { id: BRAND_ID, name: 'Acme', niche: 'consultoria', description: '' } });
    const kitQuery = query({ data: { niche: 'consultoria', audience: 'PMEs' } });
    const userClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => table === 'brands' ? brandQuery : kitQuery)
    };
    mocks.createClient.mockResolvedValue(userClient);
    mocks.createTrendsResearchCacheClient.mockReturnValue({ kind: 'admin-cache-client' });
    mocks.researchContext.mockResolvedValue({
      summary: 'Pesquisa atual.',
      sources: [{
        url: 'https://example.com/report',
        title: 'Relatório',
        publisher: 'Instituto',
        publishedAt: '2026-08-01T12:00:00.000Z',
        consultedAt: '2026-08-01T13:00:00.000Z',
        summary: 'Resumo da fonte.'
      }],
      model: 'gemini-search',
      cached: true
    });
    mocks.runSkill.mockResolvedValue({ data: { trends: [trend(1), trend(2), trend(3)] } });
  });

  it('separa o client administrativo do cache do client autenticado da skill', async () => {
    const request = new Request('http://localhost/api/trends', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandId: BRAND_ID })
    });

    const response = await POST(request);
    const userClient = await mocks.createClient.mock.results[0].value;

    expect(response.status).toBe(200);
    expect(mocks.researchContext).toHaveBeenCalledWith(expect.objectContaining({
      supabase: { kind: 'admin-cache-client' }
    }));
    expect(mocks.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      supabase: userClient,
      brandId: BRAND_ID,
      userId: 'user-1'
    }));
  });
});
