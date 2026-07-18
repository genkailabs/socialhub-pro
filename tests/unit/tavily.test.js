import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tavilySearch } from '@/lib/ai/tavily';

function tavilyResponse({ answer = 'resumo atual', results } = {}) {
  return {
    ok: true,
    json: async () => ({
      query: 'q',
      answer,
      results: results ?? [
        { title: 'Fonte A', url: 'https://a.com', content: 'trecho a', score: 0.9 },
        { title: 'Fonte B', url: 'https://b.com', content: 'trecho b', score: 0.8 }
      ]
    })
  };
}

describe('tavilySearch', () => {
  beforeEach(() => {
    process.env.TAVILY_API_KEY = 'tvly-test';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('extrai summary do answer e sources dos results', async () => {
    fetch.mockResolvedValue(tavilyResponse({ answer: 'IA avançou hoje' }));

    const out = await tavilySearch({ query: 'notícia de IA hoje' });

    expect(out.summary).toBe('IA avançou hoje');
    expect(out.sources).toEqual([
      { uri: 'https://a.com', title: 'Fonte A' },
      { uri: 'https://b.com', title: 'Fonte B' }
    ]);
  });

  it('sem answer → monta summary a partir do conteúdo dos results', async () => {
    fetch.mockResolvedValue(tavilyResponse({
      answer: '',
      results: [{ title: 'T', url: 'https://x.com', content: 'fato relevante do dia' }]
    }));

    const out = await tavilySearch({ query: 'x' });

    expect(out.summary).toContain('fato relevante do dia');
    expect(out.sources).toEqual([{ uri: 'https://x.com', title: 'T' }]);
  });

  it('envia query, include_answer e autentica', async () => {
    fetch.mockResolvedValue(tavilyResponse());

    await tavilySearch({ query: 'consulta' });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('tavily.com');
    const body = JSON.parse(opts.body);
    expect(body.query).toBe('consulta');
    expect(body.include_answer).toBe(true);
    const auth = opts.headers.Authorization || opts.headers.authorization || '';
    expect(auth).toContain('tvly-test');
  });

  it('erro HTTP lança com prefixo Tavily', async () => {
    fetch.mockResolvedValue({ ok: false, statusText: 'Unauthorized', json: async () => ({ error: 'invalid key' }) });

    await expect(tavilySearch({ query: 'x' })).rejects.toThrow(/Tavily:.*invalid key/);
  });

  it('sem TAVILY_API_KEY lança', async () => {
    delete process.env.TAVILY_API_KEY;
    await expect(tavilySearch({ query: 'x' })).rejects.toThrow(/TAVILY_API_KEY/);
  });
});
