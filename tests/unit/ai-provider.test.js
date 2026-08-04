import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deepseekChat: vi.fn(),
  groqChat: vi.fn()
}));

vi.mock('@/lib/ai/deepseek', () => ({ deepseekChat: mocks.deepseekChat }));
vi.mock('@/lib/ai/groq', () => ({ groqChat: mocks.groqChat }));

import { runText, resolveTextProvider, resolveFallbackProvider, listTextProviders } from '@/lib/ai/provider';

const OUT = { content: '{"ok":true}', usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'deepseek-v4-flash' };

describe('camada de provedores de texto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_TEXT_PROVIDER;
    mocks.deepseekChat.mockResolvedValue({ ...OUT });
  });

  it('usa o DeepSeek por padrao', async () => {
    const res = await runText({ system: 's', user: 'u' });

    expect(mocks.deepseekChat).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ content: '{"ok":true}', provider: 'deepseek', model: 'deepseek-v4-flash' });
  });

  it('repassa system, user, jsonMode, model, temperature e limite ao adapter', async () => {
    await runText({ system: 'sys', user: 'usr', jsonMode: false, temperature: 0.2, model: 'deepseek-v4-pro', maxTokens: 4096 });

    expect(mocks.deepseekChat).toHaveBeenCalledWith({
      system: 'sys',
      user: 'usr',
      jsonMode: false,
      temperature: 0.2,
      model: 'deepseek-v4-pro',
      maxTokens: 4096
    });
  });

  it('normaliza a saida com provider e usage sempre presentes', async () => {
    mocks.deepseekChat.mockResolvedValue({ content: 'oi', model: 'm' }); // sem usage

    const res = await runText({ system: 's', user: 'u' });

    expect(res).toEqual({ content: 'oi', model: 'm', provider: 'deepseek', usage: {}, finishReason: null });
  });

  // Quem chama precisa distinguir "resposta ruim" de "resposta cortada": uma se
  // resolve com outro pedido, a outra com mais espaco.
  it('repassa o motivo de parada do provedor', async () => {
    mocks.deepseekChat.mockResolvedValue({ content: '{"a":', model: 'm', finishReason: 'length' });

    expect((await runText({ system: 's', user: 'u' })).finishReason).toBe('length');
  });

  it('recusa provedor desconhecido em vez de cair em um padrao silencioso', async () => {
    await expect(runText({ system: 's', user: 'u', provider: 'gemini' }))
      .rejects.toThrow('Provedor de texto desconhecido: gemini');
  });

  it('ignora um AI_TEXT_PROVIDER invalido e mantem o padrao', () => {
    process.env.AI_TEXT_PROVIDER = 'gemini';
    expect(resolveTextProvider()).toBe('deepseek');
  });

  it('anuncia os provedores disponiveis', () => {
    expect(listTextProviders()).toEqual(['deepseek', 'groq']);
  });
});

// Falha dura do provedor (timeout, 5xx, resposta vazia) matava a geracao
// inteira. Retry no mesmo provedor nao resolve provedor fora do ar; outro
// provedor resolve. Corte de token e JSON invalido NAO entram aqui: quem
// detecta os dois e a camada de skill, que ja tem o proprio retry.
describe('fallback de provedor de texto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_TEXT_PROVIDER;
    process.env.AI_TEXT_FALLBACK = 'groq';
    process.env.GROQ_API_KEY = 'test-key';
    mocks.deepseekChat.mockResolvedValue({ ...OUT });
    mocks.groqChat.mockResolvedValue({ content: '{"ok":"groq"}', usage: {}, model: 'openai/gpt-oss-20b' });
  });

  it('nao toca no fallback quando o principal responde', async () => {
    const res = await runText({ system: 's', user: 'u' });

    expect(mocks.groqChat).not.toHaveBeenCalled();
    expect(res.provider).toBe('deepseek');
  });

  it('cai no fallback quando o principal quebra', async () => {
    mocks.deepseekChat.mockRejectedValue(new Error('DeepSeek: a geração excedeu o tempo limite.'));

    const res = await runText({ system: 's', user: 'u', maxTokens: 3000 });

    expect(res).toMatchObject({ content: '{"ok":"groq"}', provider: 'groq' });
    expect(mocks.groqChat).toHaveBeenCalledWith(expect.objectContaining({ system: 's', user: 'u', maxTokens: 3000 }));
  });

  // Resposta vazia gasta o mesmo tempo de uma falha e entrega menos: para quem
  // chama e indistinguivel de nao ter chamado.
  it('cai no fallback quando o principal devolve conteudo vazio', async () => {
    mocks.deepseekChat.mockResolvedValue({ content: '   ', usage: {}, model: 'deepseek-v4-flash' });

    expect((await runText({ system: 's', user: 'u' })).provider).toBe('groq');
  });

  // O modelo do principal nao existe no fallback; mandar junto seria pedir um
  // modelo que a outra API nao conhece.
  it('nao repassa ao fallback o modelo escolhido para o principal', async () => {
    mocks.deepseekChat.mockRejectedValue(new Error('caiu'));

    await runText({ system: 's', user: 'u', model: 'deepseek-v4-pro' });

    expect(mocks.groqChat).toHaveBeenCalledWith(expect.not.objectContaining({ model: 'deepseek-v4-pro' }));
  });

  it('propaga o erro do principal quando o fallback tambem quebra', async () => {
    mocks.deepseekChat.mockRejectedValue(new Error('DeepSeek fora do ar'));
    mocks.groqChat.mockRejectedValue(new Error('Groq fora do ar'));

    await expect(runText({ system: 's', user: 'u' })).rejects.toThrow('DeepSeek fora do ar');
  });

  // Sem chave, ligar o fallback so trocaria um erro por outro.
  it('nao tenta o fallback sem GROQ_API_KEY', async () => {
    delete process.env.GROQ_API_KEY;
    mocks.deepseekChat.mockRejectedValue(new Error('DeepSeek fora do ar'));

    await expect(runText({ system: 's', user: 'u' })).rejects.toThrow('DeepSeek fora do ar');
    expect(mocks.groqChat).not.toHaveBeenCalled();
  });

  it('fica desligado quando ninguem pediu fallback', async () => {
    delete process.env.AI_TEXT_FALLBACK;
    mocks.deepseekChat.mockRejectedValue(new Error('DeepSeek fora do ar'));

    await expect(runText({ system: 's', user: 'u' })).rejects.toThrow('DeepSeek fora do ar');
    expect(mocks.groqChat).not.toHaveBeenCalled();
  });

  // Fallback para o proprio provedor principal seria a mesma chamada de novo.
  it('ignora um fallback igual ao principal', () => {
    process.env.AI_TEXT_FALLBACK = 'deepseek';
    expect(resolveFallbackProvider('deepseek')).toBe(null);
  });

  it('ignora um fallback que nao existe', () => {
    process.env.AI_TEXT_FALLBACK = 'gemini';
    expect(resolveFallbackProvider('deepseek')).toBe(null);
  });
});

describe('groqChat direto', () => {
  async function callGroq(extra = {}) {
    process.env.GROQ_API_KEY = 'test-key';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      })
    });

    const { groqChat: actualGroqChat } = await vi.importActual('@/lib/ai/groq');
    const res = await actualGroqChat({ system: 'sys', user: 'usr', ...extra });
    const call = fetchSpy.mock.calls[0];

    fetchSpy.mockRestore();
    delete process.env.GROQ_API_KEY;
    return { url: call[0], sent: JSON.parse(call[1].body), headers: call[1].headers, res };
  }

  it('fala com a API do Groq no formato da OpenAI', async () => {
    const { url, sent, headers, res } = await callGroq();

    expect(url).toContain('api.groq.com');
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(sent.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'usr' }
    ]);
    expect(res).toMatchObject({ content: '{"ok":true}', finishReason: 'stop' });
  });

  // O fallback so serve se a resposta obedecer ao schema; sem json_object o
  // modelo volta a embrulhar o objeto em Markdown.
  it('pede JSON quando quem chama pede', async () => {
    const { sent } = await callGroq({ jsonMode: true });

    expect(sent.response_format).toEqual({ type: 'json_object' });
  });

  it('deixa o modelo trocavel por env, sem mexer no codigo', async () => {
    process.env.GROQ_MODEL = 'modelo-escolhido-por-env';
    const { sent, res } = await callGroq();
    delete process.env.GROQ_MODEL;

    expect(sent.model).toBe('modelo-escolhido-por-env');
    expect(res.model).toBe('modelo-escolhido-por-env');
  });

  it('diz que falta a chave em vez de bater na API sem credencial', async () => {
    delete process.env.GROQ_API_KEY;
    const { groqChat: actualGroqChat } = await vi.importActual('@/lib/ai/groq');

    await expect(actualGroqChat({ system: 's', user: 'u' })).rejects.toThrow('GROQ_API_KEY');
  });
});

describe('deepseekChat direto', () => {
  async function callDeepseek(model) {
    const originalEnv = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = 'test-key';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      })
    });

    // We import directly to test deepseekChat unmocked implementation
    const { deepseekChat: actualDeepSeekChat } = await vi.importActual('@/lib/ai/deepseek');
    const res = await actualDeepSeekChat({ system: 'sys', user: 'usr', model });
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body);

    fetchSpy.mockRestore();
    if (originalEnv) process.env.DEEPSEEK_API_KEY = originalEnv;
    else delete process.env.DEEPSEEK_API_KEY;
    return { sent, res };
  }

  it('envia o nome de modelo aceito pela API em vez do alias aposentado', async () => {
    const flash = await callDeepseek('deepseek-v4-flash');
    expect(flash.sent.model).toBe('deepseek-v4-flash');
    expect(flash.res.model).toBe('deepseek-v4-flash');

    const pro = await callDeepseek('deepseek-v4-pro');
    expect(pro.sent.model).toBe('deepseek-v4-pro');
    expect(pro.res.model).toBe('deepseek-v4-pro');
  });

  it('sobe chamada legada de deepseek-chat como flash mas registra o modelo pedido', async () => {
    const { sent, res } = await callDeepseek('deepseek-chat');
    expect(sent.model).toBe('deepseek-v4-flash');
    expect(res.model).toBe('deepseek-chat');
  });
});
