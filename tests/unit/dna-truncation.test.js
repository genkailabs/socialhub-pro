import { describe, it, expect, vi, beforeEach } from 'vitest';

// O Brand DNA e a resposta mais longa que o produto pede. Quando ela estoura o
// teto de tokens, o JSON chega cortado e a tela mostra "Resposta da IA nao e
// JSON valido" — erro que aponta para o lugar errado. Estes testes fixam o
// tratamento do corte.

const openrouterChat = vi.fn();
const collectSources = vi.fn();

vi.mock('@/lib/ai/openrouter', () => ({ openrouterChat: (...a) => openrouterChat(...a) }));
vi.mock('@/lib/ai/dna/collect', () => ({ collectSources: (...a) => collectSources(...a) }));
vi.mock('@/lib/ai/dna/prompt', () => ({ buildDnaPrompt: () => ({ system: 's', user: 'u' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const insertedVersion = { id: 'ver-1', version: 1, status: 'proposed', created_at: 'agora' };

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: (table) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        insert: () => chain,
        maybeSingle: async () => ({
          data: table === 'brand_dna_versions' ? insertedVersion : null,
          error: null
        }),
        then: (resolve) => resolve({ data: [], error: null })
      };
      return chain;
    }
  })
}));

const RESPOSTA_VALIDA = JSON.stringify({
  dna: { niche: 'cafeteria', audience: 'vizinhanca', tone: 'proximo' },
  report: { overall: 7, categories: [], strengths: [], weaknesses: [], opportunities: [] }
});

let analyzeBrandDNA;

beforeEach(async () => {
  vi.clearAllMocks();
  collectSources.mockResolvedValue({ sources: {}, meta: { hasIg: true } });
  ({ analyzeBrandDNA } = await import('@/lib/dna-actions'));
});

describe('analyzeBrandDNA quando a resposta e cortada', () => {
  it('pede espaco folgado na primeira tentativa, nao o teto padrao de 1200', async () => {
    openrouterChat.mockResolvedValueOnce({ content: RESPOSTA_VALIDA, usage: {}, model: 'openai/gpt-4o-mini', finishReason: 'stop' });
    await analyzeBrandDNA({ brandId: 'brd-1', brandName: 'Acme' });
    expect(openrouterChat).toHaveBeenCalledTimes(1);
    expect(openrouterChat.mock.calls[0][0].maxTokens).toBeGreaterThanOrEqual(3000);
  });

  it('repete com mais espaco quando a primeira resposta corta no limite', async () => {
    openrouterChat
      .mockResolvedValueOnce({ content: '{"dna":{"nic', usage: {}, model: 'openai/gpt-4o-mini', finishReason: 'length' })
      .mockResolvedValueOnce({ content: RESPOSTA_VALIDA, usage: {}, model: 'openai/gpt-4o-mini', finishReason: 'stop' });

    const res = await analyzeBrandDNA({ brandId: 'brd-1', brandName: 'Acme' });

    expect(openrouterChat).toHaveBeenCalledTimes(2);
    const primeiro = openrouterChat.mock.calls[0][0].maxTokens;
    const segundo = openrouterChat.mock.calls[1][0].maxTokens;
    expect(segundo).toBeGreaterThan(primeiro);
    expect(res.ok).toBe(true);
  });

  it('nao repete quando o JSON e invalido mas a resposta veio inteira', async () => {
    // Repetir aqui so gastaria credito: o problema nao e espaco.
    openrouterChat.mockResolvedValueOnce({ content: 'desculpe, nao consigo', usage: {}, model: 'openai/gpt-4o-mini', finishReason: 'stop' });
    const res = await analyzeBrandDNA({ brandId: 'brd-1', brandName: 'Acme' });
    expect(openrouterChat).toHaveBeenCalledTimes(1);
    expect(res.error).toContain('JSON');
  });

  it('explica o corte em vez de culpar o formato quando nem o retry cabe', async () => {
    openrouterChat.mockResolvedValue({ content: '{"dna":{"nic', usage: {}, model: 'openai/gpt-4o-mini', finishReason: 'length' });
    const res = await analyzeBrandDNA({ brandId: 'brd-1', brandName: 'Acme' });
    expect(openrouterChat).toHaveBeenCalledTimes(2);
    expect(res.error).toMatch(/tokens/);
    expect(res.error).not.toMatch(/JSON/);
  });
});
