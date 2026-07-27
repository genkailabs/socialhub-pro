import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deepseekChat: vi.fn(),
  needsResearch: vi.fn(),
  researchContext: vi.fn(),
  buildContentPrompt: vi.fn(() => ({ system: 's', user: 'u' })),
  renderArrayBuffer: vi.fn()
}));

vi.mock('next/og', () => ({ ImageResponse: class { async arrayBuffer() { return mocks.renderArrayBuffer(); } } }));
vi.mock('@/lib/ai/deepseek', () => ({ deepseekChat: mocks.deepseekChat }));
vi.mock('@/lib/ai/pollinations-image', () => ({ pollinationsImage: vi.fn(), hasPollinationsKey: () => false, POLLINATIONS_IMAGE_MODEL: 'flux' }));
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
    mocks.renderArrayBuffer.mockResolvedValue(new ArrayBuffer(0));
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

  it('tenta novamente quando o DeepSeek retorna texto que nao e JSON', async () => {
    mocks.needsResearch.mockReturnValue(false);
    mocks.deepseekChat
      .mockResolvedValueOnce({ content: 'resposta quebrada', usage: {}, model: 'deepseek-v4-flash' })
      .mockResolvedValueOnce({ content: SPEC, usage: { prompt_tokens: 12, completion_tokens: 6 }, model: 'deepseek-v4-flash' });

    const out = await generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'dicas' }, generateImages: false });

    expect(out.spec.caption).toBe('legenda');
    expect(mocks.deepseekChat).toHaveBeenCalledTimes(2);
    expect(mocks.deepseekChat.mock.calls[1][0]).toMatchObject({ temperature: 0.2, maxTokens: 1800 });
  });

  // finish_reason "length" = resposta cortada no teto, nao malformada. O retry
  // precisa de mais espaco (nao de outro pedido de formatacao) ou reproduz o corte.
  it('resposta cortada no teto: retry pede mais tokens em vez de so reforcar o formato', async () => {
    mocks.needsResearch.mockReturnValue(false);
    mocks.deepseekChat
      .mockResolvedValueOnce({ content: '{"headline":"cortou aqui', usage: {}, model: 'deepseek-v4-flash', finishReason: 'length' })
      .mockResolvedValueOnce({ content: SPEC, usage: { prompt_tokens: 12, completion_tokens: 6 }, model: 'deepseek-v4-flash' });

    const out = await generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'dicas' }, generateImages: false });

    expect(out.spec.caption).toBe('legenda');
    expect(mocks.deepseekChat).toHaveBeenCalledTimes(2);
    expect(mocks.deepseekChat.mock.calls[1][0]).toMatchObject({ user: 'u', temperature: 0.9, maxTokens: 3200 });
  });

  it('com pesquisa: injeta research no prompt e devolve no retorno', async () => {
    mocks.needsResearch.mockReturnValue(true);
    mocks.researchContext.mockResolvedValue({ summary: 'atual', sources: [{ uri: 'https://x', title: 'X' }], usage: { prompt_tokens: 20, completion_tokens: 8 }, model: 'tavily-search', cost: 0.01, cached: false });

    const out = await generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'IA hoje', format: 'news' }, generateImages: false });

    expect(mocks.researchContext).toHaveBeenCalledTimes(1);
    expect(mocks.buildContentPrompt).toHaveBeenCalledWith(expect.objectContaining({ research: expect.objectContaining({ summary: 'atual' }) }));
    expect(out.research).toMatchObject({ summary: 'atual', cost: 0.01, cached: false });
  });

  it('uses handed verified research without a second provider fetch', async () => {
    mocks.needsResearch.mockReturnValue(true);
    const verifiedResearch = {
      summary: 'Fatos verificados.',
      sources: [{ url: 'https://example.com/fato', title: 'Fato', publisher: 'Example', publishedAt: '2026-07-20T10:00:00.000Z', consultedAt: '2026-07-26T10:00:00.000Z', summary: 'Resumo.' }],
      images: []
    };

    const out = await generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'IA hoje', format: 'news' }, verifiedResearch, generateImages: false });

    expect(mocks.researchContext).not.toHaveBeenCalled();
    expect(mocks.buildContentPrompt).toHaveBeenCalledWith(expect.objectContaining({ research: verifiedResearch }));
    expect(out.research).toBe(verifiedResearch);
  });

  it('pesquisa falha: propaga erro e não chama o DeepSeek', async () => {
    mocks.needsResearch.mockReturnValue(true);
    mocks.researchContext.mockRejectedValue(new ResearchUnavailableError());

    await expect(generateCreative({ supabase: {}, brandId: 'b1', brandName: 'Marca', brief: { topic: 'IA hoje', format: 'news' }, generateImages: false }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
    expect(mocks.deepseekChat).not.toHaveBeenCalled();
  });

  it('writes generated media under an optional namespace', async () => {
    mocks.needsResearch.mockReturnValue(false);
    const upload = vi.fn().mockResolvedValue({ error: null });
    const bucket = {
      upload,
      remove: vi.fn(),
      getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://cdn.example/${path}` } }))
    };

    const out = await generateCreative({
      supabase: { storage: { from: vi.fn(() => bucket) } },
      brandId: 'b1',
      brandName: 'Marca',
      brief: { topic: 'dicas' },
      generateImages: true,
      maxImages: 1,
      mediaNamespace: 'daily/claim-1'
    });

    expect(upload.mock.calls[0][0]).toMatch(/^b1\/daily\/claim-1\/ai-\d+-0\.png$/);
    expect(out.storagePaths).toEqual([upload.mock.calls[0][0]]);
  });

  it('removes previously uploaded media when a later carousel upload fails', async () => {
    mocks.needsResearch.mockReturnValue(false);
    mocks.deepseekChat.mockResolvedValue({
      content: JSON.stringify({
        template: 'tips_carousel', headline: 'Dicas', caption: 'Legenda',
        bullets: ['Primeira', 'Segunda'], hashtags: ['#dicas']
      }),
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      model: 'deepseek-v4-flash'
    });
    const upload = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'falha no segundo upload' } });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const bucket = {
      upload,
      remove,
      getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://cdn.example/${path}` } }))
    };
    const supabase = { storage: { from: vi.fn(() => bucket) } };

    await expect(generateCreative({
      supabase, brandId: 'b1', brandName: 'Marca', brief: { topic: 'dicas' },
      generateImages: true, maxImages: 2
    })).rejects.toThrow('falha no segundo upload');

    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][0]).toMatch(/^b1\/ai-\d+-0\.png$/);
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });

  it('surfaces cleanup failures with safe durable orphan metadata', async () => {
    mocks.needsResearch.mockReturnValue(false);
    mocks.deepseekChat.mockResolvedValue({
      content: JSON.stringify({
        template: 'tips_carousel', headline: 'Dicas', caption: 'Legenda',
        bullets: ['Primeira'], hashtags: ['#dicas']
      }),
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      model: 'deepseek-v4-flash'
    });
    const upload = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'falha no segundo upload' } });
    const remove = vi.fn().mockResolvedValue({ error: { message: 'raw bucket permission detail' } });
    const bucket = {
      upload,
      remove,
      getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://cdn.example/${path}` } }))
    };
    const supabase = { storage: { from: vi.fn(() => bucket) } };

    await expect(generateCreative({
      supabase, brandId: 'b1', brandName: 'Marca', brief: { topic: 'dicas' },
      generateImages: true, maxImages: 2
    })).rejects.toMatchObject({
      cleanupPendingPaths: [expect.stringContaining('b1/ai-')],
      cleanupError: 'Não foi possível remover as mídias geradas.'
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
