import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  openrouterChat: vi.fn()
}));

vi.mock('@/lib/ai/openrouter', () => ({ openrouterChat: mocks.openrouterChat }));

import { runText, resolveTextProvider, resolveFallbackProvider, listTextProviders } from '@/lib/ai/provider';

const OUT = { content: '{"ok":true}', usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'openai/gpt-4o-mini' };

describe('camada de provedores de texto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_TEXT_PROVIDER;
    mocks.openrouterChat.mockResolvedValue({ ...OUT });
  });

  it('usa o OpenRouter por padrao', async () => {
    const res = await runText({ system: 's', user: 'u' });

    expect(mocks.openrouterChat).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ content: '{"ok":true}', provider: 'openrouter', model: 'openai/gpt-4o-mini' });
  });

  it('repassa system, user, jsonMode, model, temperature e limite ao adapter', async () => {
    await runText({ system: 'sys', user: 'usr', jsonMode: false, temperature: 0.2, model: 'openai/gpt-4o', maxTokens: 4096 });

    expect(mocks.openrouterChat).toHaveBeenCalledWith({
      system: 'sys',
      user: 'usr',
      jsonMode: false,
      temperature: 0.2,
      model: 'openai/gpt-4o',
      maxTokens: 4096
    });
  });

  it('normaliza a saida com provider e usage sempre presentes', async () => {
    mocks.openrouterChat.mockResolvedValue({ content: 'oi', model: 'm' }); // sem usage

    const res = await runText({ system: 's', user: 'u' });

    expect(res).toEqual({ content: 'oi', model: 'm', provider: 'openrouter', usage: {}, finishReason: null });
  });

  // Quem chama precisa distinguir "resposta ruim" de "resposta cortada": uma se
  // resolve com outro pedido, a outra com mais espaco.
  it('repassa o motivo de parada do provedor', async () => {
    mocks.openrouterChat.mockResolvedValue({ content: '{"a":', model: 'm', finishReason: 'length' });

    expect((await runText({ system: 's', user: 'u' })).finishReason).toBe('length');
  });

  it('recusa provedor desconhecido em vez de cair em um padrao silencioso', async () => {
    await expect(runText({ system: 's', user: 'u', provider: 'gemini' }))
      .rejects.toThrow('Provedor de texto desconhecido: gemini');
  });

  it('ignora um AI_TEXT_PROVIDER invalido e mantem o padrao', () => {
    process.env.AI_TEXT_PROVIDER = 'gemini';
    expect(resolveTextProvider()).toBe('openrouter');
  });

  it('anuncia os provedores disponiveis', () => {
    expect(listTextProviders()).toEqual(['openrouter']);
  });
});

// Decisão de 2026-08-04: OpenRouter é o único provedor de texto. Sem um
// segundo adapter cadastrado, `resolveFallbackProvider` nunca acha alguém pra
// cair — mesmo que `AI_TEXT_FALLBACK` seja setado por engano no ambiente.
describe('sem fallback: nenhum segundo provedor esta cadastrado', () => {
  it('AI_TEXT_FALLBACK apontando pro proprio principal nao vira fallback', () => {
    process.env.AI_TEXT_FALLBACK = 'openrouter';
    expect(resolveFallbackProvider('openrouter')).toBe(null);
    delete process.env.AI_TEXT_FALLBACK;
  });

  it('AI_TEXT_FALLBACK apontando pra um provedor desconhecido (ex: deepseek/groq) nao vira fallback', () => {
    process.env.AI_TEXT_FALLBACK = 'deepseek';
    expect(resolveFallbackProvider('openrouter')).toBe(null);
    process.env.AI_TEXT_FALLBACK = 'groq';
    expect(resolveFallbackProvider('openrouter')).toBe(null);
    delete process.env.AI_TEXT_FALLBACK;
  });

  it('provedor principal quebra e sobe o erro dele, sem segunda tentativa em outro provedor', async () => {
    mocks.openrouterChat.mockRejectedValue(new Error('OpenRouter: serviço indisponível (503).'));

    await expect(runText({ system: 's', user: 'u' })).rejects.toThrow('OpenRouter: serviço indisponível (503).');
    expect(mocks.openrouterChat).toHaveBeenCalledTimes(1);
  });
});

describe('openrouterChat direto', () => {
  async function callOpenRouter(extra = {}, fetchImpl) {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(fetchImpl || (async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      })
    })));

    const { openrouterChat: actual } = await vi.importActual('@/lib/ai/openrouter');
    let res, error;
    try {
      res = await actual({ system: 'sys', user: 'usr', ...extra });
    } catch (e) {
      error = e;
    }
    const call = fetchSpy.mock.calls[0];

    fetchSpy.mockRestore();
    delete process.env.OPENROUTER_API_KEY;
    return { url: call?.[0], sent: call ? JSON.parse(call[1].body) : null, headers: call?.[1]?.headers, res, error };
  }

  it('fala com a API do OpenRouter no formato da OpenAI, com os headers de identificacao do app', async () => {
    const { url, sent, headers, res } = await callOpenRouter();

    expect(url).toContain('openrouter.ai/api/v1/chat/completions');
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBeTruthy();
    expect(headers['X-Title']).toBe('Social Hub');
    expect(sent.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'usr' }
    ]);
    expect(res).toMatchObject({ content: '{"ok":true}', finishReason: 'stop' });
  });

  it('pede JSON quando quem chama pede', async () => {
    const { sent } = await callOpenRouter({ jsonMode: true });
    expect(sent.response_format).toEqual({ type: 'json_object' });
  });

  it('usa o modelo padrao (gpt-4o-mini) quando ninguem escolhe outro', async () => {
    const { sent, res } = await callOpenRouter();
    expect(sent.model).toBe('openai/gpt-4o-mini');
    expect(res.model).toBe('openai/gpt-4o-mini');
  });

  it('deixa o modelo trocavel por env, sem mexer no codigo', async () => {
    process.env.OPENROUTER_TEXT_MODEL = 'modelo-escolhido-por-env';
    const { sent, res } = await callOpenRouter();
    delete process.env.OPENROUTER_TEXT_MODEL;

    expect(sent.model).toBe('modelo-escolhido-por-env');
    expect(res.model).toBe('modelo-escolhido-por-env');
  });

  it('diz que falta a chave em vez de bater na API sem credencial', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { openrouterChat: actual } = await vi.importActual('@/lib/ai/openrouter');

    await expect(actual({ system: 's', user: 'u' })).rejects.toThrow('OPENROUTER_API_KEY');
  });

  // Matriz de erro (item 6 do pedido): cada status pede uma mensagem que diz
  // o que aconteceu, pra quem lê o log em generation_jobs sem precisar abrir
  // o painel do OpenRouter.
  const statusCases = [
    { status: 401, msg: 'chave de API inválida' },
    { status: 402, msg: 'saldo insuficiente' },
    { status: 429, msg: 'limite de requisições' },
    { status: 500, msg: 'serviço indisponível' },
    { status: 503, msg: 'serviço indisponível' }
  ];
  for (const { status, msg } of statusCases) {
    it(`erro HTTP ${status} vira uma mensagem que diz "${msg}"`, async () => {
      const { error } = await callOpenRouter({}, async () => ({
        ok: false,
        status,
        statusText: 'erro',
        json: async () => ({ error: { message: 'detalhe da API' } })
      }));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain(msg);
    });
  }

  it('resposta que nao e JSON valido cai no tratamento generico de erro', async () => {
    const { error } = await callOpenRouter({}, async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => { throw new Error('corpo nao e JSON'); }
    }));

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('OpenRouter');
  });

  it('timeout vira mensagem clara em vez do erro cru do AbortSignal', async () => {
    const { error } = await callOpenRouter({}, async () => {
      const abortError = new Error('timeout');
      abortError.name = 'TimeoutError';
      throw abortError;
    });

    expect(error.message).toBe('OpenRouter: a geração excedeu o tempo limite.');
  });

  it('resposta vazia sobe como conteudo vazio (quem detecta e o runText)', async () => {
    const { res } = await callOpenRouter({}, async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '' }, finish_reason: 'stop' }], usage: {} })
    }));

    expect(res.content).toBe('');
  });
});
