import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiGrounded } from '@/lib/ai/gemini';

// Resposta típica do Gemini com Google Search Grounding: texto + groundingMetadata
function groundedResponse({ text = 'resumo atual', chunks } = {}) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{
        content: { parts: [{ text }] },
        groundingMetadata: chunks ? { groundingChunks: chunks } : undefined
      }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 34 }
    })
  };
}

describe('geminiGrounded', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('extrai summary e sources do groundingMetadata', async () => {
    fetch.mockResolvedValue(groundedResponse({
      text: 'IA avançou hoje',
      chunks: [
        { web: { uri: 'https://a.com', title: 'Fonte A' } },
        { web: { uri: 'https://b.com', title: 'Fonte B' } }
      ]
    }));

    const out = await geminiGrounded({ query: 'notícia de IA hoje' });

    expect(out.summary).toBe('IA avançou hoje');
    expect(out.sources).toEqual([
      { uri: 'https://a.com', title: 'Fonte A' },
      { uri: 'https://b.com', title: 'Fonte B' }
    ]);
    expect(out.usage).toEqual({ prompt_tokens: 12, completion_tokens: 34 });
    expect(out.model).toBeTruthy();
  });

  it('sem chunks mas com texto → sources vazio, summary presente', async () => {
    fetch.mockResolvedValue(groundedResponse({ text: 'resposta sem fontes', chunks: undefined }));

    const out = await geminiGrounded({ query: 'x' });

    expect(out.summary).toBe('resposta sem fontes');
    expect(out.sources).toEqual([]);
  });

  it('envia tool google_search e não força JSON', async () => {
    fetch.mockResolvedValue(groundedResponse());

    await geminiGrounded({ query: 'consulta' });

    const [, opts] = fetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.tools).toEqual([{ google_search: {} }]);
    expect(body.generationConfig?.responseMimeType).toBeUndefined();
    expect(body.contents[0].parts[0].text).toContain('consulta');
  });

  it('erro HTTP lança com prefixo Gemini', async () => {
    fetch.mockResolvedValue({ ok: false, statusText: 'Too Many Requests', json: async () => ({ error: { message: 'quota' } }) });

    await expect(geminiGrounded({ query: 'x' })).rejects.toThrow(/Gemini:.*quota/);
  });

  it('sem GEMINI_API_KEY lança', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(geminiGrounded({ query: 'x' })).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
