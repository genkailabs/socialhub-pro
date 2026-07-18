import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ geminiGrounded: vi.fn() }));
vi.mock('@/lib/ai/gemini', () => ({ geminiGrounded: mocks.geminiGrounded }));

import { needsResearch, buildResearchQuery, researchContext, ResearchUnavailableError } from '@/lib/ai/research';

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
  it('format news sempre pesquisa', () => {
    expect(needsResearch({ format: 'news' })).toBe(true);
    expect(needsResearch({ topic: 'qualquer', format: 'news' })).toBe(true);
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
    process.env.GEMINI_API_KEY = 'test';
  });

  it('summary não-vazio → sucesso com custo', async () => {
    mocks.geminiGrounded.mockResolvedValue({
      summary: 'contexto atual', sources: [{ uri: 'https://a.com', title: 'A' }],
      usage: { prompt_tokens: 100, completion_tokens: 50 }, model: 'gemini-2.5-flash'
    });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: { niche: 'tech' } });

    expect(out.summary).toBe('contexto atual');
    expect(out.sources).toHaveLength(1);
    expect(out.cached).toBe(false);
    expect(out.cost).toBeGreaterThan(0);
    expect(mocks.geminiGrounded).toHaveBeenCalledTimes(1);
  });

  it('summary vazio → lança ResearchUnavailableError', async () => {
    mocks.geminiGrounded.mockResolvedValue({ summary: '', sources: [], usage: {}, model: 'gemini-2.5-flash' });

    await expect(researchContext({ brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
  });

  it('Gemini falha → lança ResearchUnavailableError com code', async () => {
    mocks.geminiGrounded.mockRejectedValue(new Error('quota'));

    await expect(researchContext({ brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toMatchObject({ code: 'research_unavailable' });
  });
});
