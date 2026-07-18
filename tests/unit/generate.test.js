import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deepseekChat: vi.fn(),
  needsResearch: vi.fn(),
  researchContext: vi.fn(),
  buildContentPrompt: vi.fn(() => ({ system: 's', user: 'u' }))
}));

vi.mock('next/og', () => ({ ImageResponse: class { async arrayBuffer() { return new ArrayBuffer(0); } } }));
vi.mock('@/lib/ai/deepseek', () => ({ deepseekChat: mocks.deepseekChat }));
vi.mock('@/lib/ai/deapi', () => ({ deapiGenerateImage: vi.fn(), hasDeapiKey: () => false, DEAPI_DEFAULT_MODEL: 'flux' }));
vi.mock('@/lib/ai/research', async () => {
  const actual = await vi.importActual('@/lib/ai/research');
  return { ...actual, needsResearch: mocks.needsResearch, researchContext: mocks.researchContext };
});
vi.mock('@/lib/ai/prompt', () => ({ buildContentPrompt: mocks.buildContentPrompt }));

import { generateCreative } from '@/lib/ai/generate';
import { ResearchUnavailableError } from '@/lib/ai/research';

const SPEC = '{"template":"news","headline":"Oi","caption":"legenda","hashtags":["#a"]}';

describe('generateCreative + pesquisa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deepseekChat.mockResolvedValue({ content: SPEC, usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'deepseek-v4-flash' });
  });

  it('sem pesquisa: não chama researchContext, prompt sem research', async () => {
    mocks.needsResearch.mockReturnValue(false);

    const out = await generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'dicas', format: 'quote' }, generateImages: false });

    expect(mocks.researchContext).not.toHaveBeenCalled();
    expect(mocks.buildContentPrompt).toHaveBeenCalledWith(expect.objectContaining({ research: null }));
    expect(out.research).toBeNull();
    expect(mocks.deepseekChat).toHaveBeenCalledTimes(1);
  });

  it('com pesquisa: injeta research no prompt e devolve no retorno', async () => {
    mocks.needsResearch.mockReturnValue(true);
    mocks.researchContext.mockResolvedValue({ summary: 'atual', sources: [{ uri: 'https://x', title: 'X' }], usage: { prompt_tokens: 20, completion_tokens: 8 }, model: 'tavily-search', cost: 0.01, cached: false });

    const out = await generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'IA hoje', format: 'news' }, generateImages: false });

    expect(mocks.researchContext).toHaveBeenCalledTimes(1);
    expect(mocks.buildContentPrompt).toHaveBeenCalledWith(expect.objectContaining({ research: expect.objectContaining({ summary: 'atual' }) }));
    expect(out.research).toMatchObject({ summary: 'atual', cost: 0.01, cached: false });
  });

  it('pesquisa falha: propaga erro e não chama o DeepSeek', async () => {
    mocks.needsResearch.mockReturnValue(true);
    mocks.researchContext.mockRejectedValue(new ResearchUnavailableError());

    await expect(generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'IA hoje', format: 'news' }, generateImages: false }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
    expect(mocks.deepseekChat).not.toHaveBeenCalled();
  });
});
