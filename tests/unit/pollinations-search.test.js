import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pollinationsSearch } from '@/lib/ai/pollinations-search';

// Resposta OpenAI-compat do gen.pollinations.ai com groundingMetadata do Gemini.
function searchResponse({ content = 'resumo atual', chunks } = {}) {
  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: { role: 'assistant', content },
        groundingMetadata: chunks ? { groundingChunks: chunks } : {}
      }],
      usage: { prompt_tokens: 12, completion_tokens: 34 },
      model: 'gemini-2.5-flash-lite'
    })
  };
}

describe('pollinationsSearch', () => {
  beforeEach(() => {
    process.env.POLLINATIONS_SECRET_KEY = 'sk_test';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('extrai summary do content e sources dos groundingChunks', async () => {
    fetch.mockResolvedValue(searchResponse({
      content: 'IA avançou hoje',
      chunks: [
        { web: { uri: 'https://a.com', title: 'Fonte A' } },
        { web: { uri: 'https://b.com', title: 'Fonte B' } }
      ]
    }));

    const out = await pollinationsSearch({ query: 'notícia de IA hoje' });

    expect(out.summary).toBe('IA avançou hoje');
    expect(out.sources).toEqual([
      { uri: 'https://a.com', title: 'Fonte A' },
      { uri: 'https://b.com', title: 'Fonte B' }
    ]);
    expect(out.model).toBe('gemini-search');
  });

  it('sem chunks mas com texto → sources vazio, summary presente', async () => {
    fetch.mockResolvedValue(searchResponse({ content: 'resposta sem fontes' }));

    const out = await pollinationsSearch({ query: 'x' });

    expect(out.summary).toBe('resposta sem fontes');
    expect(out.sources).toEqual([]);
  });

  it('chama o endpoint certo com model gemini-search e Bearer', async () => {
    fetch.mockResolvedValue(searchResponse());

    await pollinationsSearch({ query: 'consulta' });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('gen.pollinations.ai/v1/chat/completions');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('gemini-search');
    expect(body.messages[0].content).toContain('consulta');
    expect(opts.headers.Authorization).toContain('sk_test');
  });

  it('erro HTTP lança com prefixo Pollinations', async () => {
    fetch.mockResolvedValue({ ok: false, statusText: 'Too Many Requests', json: async () => ({ error: { message: 'rate limit' } }) });

    await expect(pollinationsSearch({ query: 'x' })).rejects.toThrow(/Pollinations:.*rate limit/);
  });

  it('sem POLLINATIONS_SECRET_KEY lança', async () => {
    delete process.env.POLLINATIONS_SECRET_KEY;
    await expect(pollinationsSearch({ query: 'x' })).rejects.toThrow(/POLLINATIONS_SECRET_KEY/);
  });
});
