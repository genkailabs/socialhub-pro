import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pollinationsSearch: vi.fn() }));
vi.mock('@/lib/ai/pollinations-search', () => ({ pollinationsSearch: mocks.pollinationsSearch }));

import { needsResearch, buildResearchQuery, researchContext, ResearchUnavailableError } from '@/lib/ai/research';

// Fake mínimo do client Supabase p/ o cache. `row` = o que o SELECT devolve
// (null = miss). Registra o que foi gravado em `upserts`.
function fakeSupabase({ row = null } = {}) {
  const upserts = [];
  return {
    upserts,
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        gte() { return this; },
        maybeSingle: async () => ({ data: row, error: null }),
        upsert: async (payload) => { upserts.push(payload); return { error: null }; }
      };
    }
  };
}

describe('needsResearch', () => {
  it('gatilho textual → true', () => {
    expect(needsResearch({ topic: 'notícia sobre IA hoje' })).toBe(true);
    expect(needsResearch({ topic: 'lançamento do iPhone' })).toBe(true);
    expect(needsResearch({ topic: 'tendências 2026' })).toBe(true);
  });
  it('acento ausente ainda dispara', () => {
    expect(needsResearch({ topic: 'ultimas noticias de tecnologia' })).toBe(true);
    expect(needsResearch({ topic: 'tendencia do momento' })).toBe(true);
  });
  it('formato notícia (texto livre) sempre pesquisa', () => {
    expect(needsResearch({ format: 'news' })).toBe(true);
    expect(needsResearch({ format: 'Notícia' })).toBe(true);
    expect(needsResearch({ topic: 'qualquer', format: 'Notícia comentada' })).toBe(true);
  });
  it('formato livre não-notícia usa só o gatilho do tema', () => {
    expect(needsResearch({ format: 'Parecer Simplificado', topic: 'contrato de aluguel' })).toBe(false);
  });
  it('flag explícita força pesquisa (modo avançado)', () => {
    expect(needsResearch({ topic: 'dicas de foco', format: 'quote', research: true })).toBe(true);
  });
  it('tema atemporal → false', () => {
    expect(needsResearch({ topic: 'dicas de foco', format: 'tips_carousel' })).toBe(false);
    expect(needsResearch({ topic: 'frase motivacional', format: 'quote' })).toBe(false);
    expect(needsResearch({ topic: '', format: 'promo' })).toBe(false);
  });
});

describe('buildResearchQuery', () => {
  it('inclui tema e nicho', () => {
    const q = buildResearchQuery({ brief: { topic: 'IA generativa' }, kit: { niche: 'tecnologia' } });
    expect(q).toContain('IA generativa');
    expect(q).toContain('tecnologia');
  });
  it('é determinístico', () => {
    const a = buildResearchQuery({ brief: { topic: 'x' }, kit: { niche: 'y' } });
    const b = buildResearchQuery({ brief: { topic: 'x' }, kit: { niche: 'y' } });
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('researchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POLLINATIONS_SECRET_KEY = 'test';
  });

  it('summary não-vazio → sucesso com custo', async () => {
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'contexto atual', sources: [{ uri: 'https://a.com', title: 'A' }],
      usage: { prompt_tokens: 100, completion_tokens: 50 }, model: 'gemini-search'
    });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: { niche: 'tech' } });

    expect(out.summary).toBe('contexto atual');
    expect(out.sources).toHaveLength(1);
    expect(out.cached).toBe(false);
    expect(out.cost).toBeGreaterThan(0);
    expect(mocks.pollinationsSearch).toHaveBeenCalledTimes(1);
  });

  it('summary vazio → lança ResearchUnavailableError', async () => {
    mocks.pollinationsSearch.mockResolvedValue({ summary: '', sources: [], usage: {}, model: 'gemini-search' });

    await expect(researchContext({ brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
  });

  it('Pollinations falha → lança ResearchUnavailableError com code', async () => {
    mocks.pollinationsSearch.mockRejectedValue(new Error('quota'));

    await expect(researchContext({ brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toMatchObject({ code: 'research_unavailable' });
  });

  it('cache hit (<6h) → não chama Pollinations, custo zero', async () => {
    const supabase = fakeSupabase({
      row: { summary: 'do cache', sources: [{ uri: 'https://c.com', title: 'C' }], model: 'gemini-search', created_at: new Date().toISOString() }
    });

    const out = await researchContext({ supabase, brief: { topic: 'IA hoje' }, kit: {} });

    expect(out.summary).toBe('do cache');
    expect(out.cached).toBe(true);
    expect(out.cost).toBe(0);
    expect(mocks.pollinationsSearch).not.toHaveBeenCalled();
    expect(supabase.upserts).toHaveLength(0);
  });

  it('cache miss → chama Pollinations e grava sucesso', async () => {
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'fresco', sources: [], usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'gemini-search'
    });
    const supabase = fakeSupabase({ row: null });

    const out = await researchContext({ supabase, brief: { topic: 'IA hoje' }, kit: {} });

    expect(out.cached).toBe(false);
    expect(mocks.pollinationsSearch).toHaveBeenCalledTimes(1);
    expect(supabase.upserts).toHaveLength(1);
    expect(supabase.upserts[0]).toMatchObject({ summary: 'fresco' });
    expect(supabase.upserts[0].query_hash).toBeTruthy();
  });

  it('falha na pesquisa nunca grava cache', async () => {
    mocks.pollinationsSearch.mockRejectedValue(new Error('down'));
    const supabase = fakeSupabase({ row: null });

    await expect(researchContext({ supabase, brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
    expect(supabase.upserts).toHaveLength(0);
  });
});
