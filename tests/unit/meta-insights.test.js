import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseInsights, fetchInstagramInsights, MISSING_PERMISSION_CODES } from '@/lib/meta/insights';

describe('parseInsights', () => {
  it('achata a resposta do Graph em numeros', () => {
    const payload = { data: [
      { name: 'reach', values: [{ value: 500 }] },
      { name: 'impressions', values: [{ value: 800 }] },
      { name: 'profile_views', values: [{ value: 20 }] }
    ] };

    expect(parseInsights(payload)).toEqual({ reach: 500, impressions: 800, profileViews: 20 });
  });

  it('soma janelas quando a Meta devolve mais de um valor', () => {
    const payload = { data: [{ name: 'reach', values: [{ value: 100 }, { value: 50 }] }] };

    expect(parseInsights(payload)).toEqual({ reach: 150 });
  });

  it('ignora metrica que a Meta nao reconheceu', () => {
    expect(parseInsights({ data: [{ name: 'inventada', values: [{ value: 1 }] }] })).toEqual({});
  });

  it('aguenta resposta vazia', () => {
    expect(parseInsights({})).toEqual({});
    expect(parseInsights(null)).toEqual({});
  });
});

describe('fetchInstagramInsights', () => {
  beforeEach(() => vi.restoreAllMocks());

  const mockFetch = (payload, ok = true) => {
    const f = vi.fn().mockResolvedValue({ ok, json: async () => payload });
    vi.stubGlobal('fetch', f);
    return f;
  };

  it('devolve as metricas quando a permissao existe', async () => {
    mockFetch({ data: [{ name: 'reach', values: [{ value: 500 }] }] });

    await expect(fetchInstagramInsights('ig-1', 'tok')).resolves.toEqual({ reach: 500 });
  });

  // Falta de permissao e um estado esperado, nao um erro: o diagnostico segue
  // sem alcance e a skill trata como indisponivel (nunca como zero).
  it('devolve nulo quando falta a permissao de insights', async () => {
    mockFetch({ error: { code: 10, message: 'requires instagram_manage_insights permission' } });

    await expect(fetchInstagramInsights('ig-1', 'tok')).resolves.toBeNull();
  });

  it('devolve nulo quando a Meta recusa a metrica para a conta', async () => {
    mockFetch({ error: { code: 100, error_subcode: 2108006, message: 'metric not supported' } });

    await expect(fetchInstagramInsights('ig-1', 'tok')).resolves.toBeNull();
  });

  it('devolve nulo quando a rede falha, sem derrubar o diagnostico', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(fetchInstagramInsights('ig-1', 'tok')).resolves.toBeNull();
  });

  // Token expirado nao e "sem permissao": precisa chegar na tela de reconexao.
  it('propaga erro de token invalido', async () => {
    mockFetch({ error: { code: 190, message: 'Error validating access token' } });

    await expect(fetchInstagramInsights('ig-1', 'tok')).rejects.toThrow('token');
  });

  it('trata os codigos de permissao conhecidos', () => {
    expect(MISSING_PERMISSION_CODES.has(10)).toBe(true);
    expect(MISSING_PERMISSION_CODES.has(190)).toBe(false);
  });
});
