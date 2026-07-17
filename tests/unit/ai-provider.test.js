import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deepseekChat: vi.fn(),
  geminiChat: vi.fn()
}));

vi.mock('@/lib/ai/deepseek', () => ({ deepseekChat: mocks.deepseekChat }));
vi.mock('@/lib/ai/gemini', () => ({ geminiChat: mocks.geminiChat }));

import { runText, resolveTextProvider, listTextProviders } from '@/lib/ai/provider';

const OUT = { content: '{"ok":true}', usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'x' };

describe('camada de provedores de texto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_TEXT_PROVIDER;
    mocks.deepseekChat.mockResolvedValue({ ...OUT, model: 'deepseek-v4-flash' });
    mocks.geminiChat.mockResolvedValue({ ...OUT, model: 'gemini-2.5-flash' });
  });

  it('usa o DeepSeek por padrao', async () => {
    const res = await runText({ system: 's', user: 'u' });

    expect(mocks.deepseekChat).toHaveBeenCalledTimes(1);
    expect(mocks.geminiChat).not.toHaveBeenCalled();
    expect(res).toMatchObject({ content: '{"ok":true}', provider: 'deepseek', model: 'deepseek-v4-flash' });
  });

  // O ponto da abstracao: trocar de provedor sem tocar em quem chama.
  it('troca de provedor por variavel de ambiente, com a mesma chamada', async () => {
    process.env.AI_TEXT_PROVIDER = 'gemini';

    const res = await runText({ system: 's', user: 'u' });

    expect(mocks.geminiChat).toHaveBeenCalledTimes(1);
    expect(mocks.deepseekChat).not.toHaveBeenCalled();
    expect(res.provider).toBe('gemini');
  });

  it('deixa o chamador forcar um provedor, acima do ambiente', async () => {
    process.env.AI_TEXT_PROVIDER = 'deepseek';

    const res = await runText({ system: 's', user: 'u', provider: 'gemini' });

    expect(res.provider).toBe('gemini');
    expect(mocks.geminiChat).toHaveBeenCalledTimes(1);
  });

  it('repassa system, user, jsonMode, model e temperature ao adapter', async () => {
    await runText({ system: 'sys', user: 'usr', jsonMode: false, temperature: 0.2, model: 'deepseek-v4-pro' });

    expect(mocks.deepseekChat).toHaveBeenCalledWith({
      system: 'sys',
      user: 'usr',
      jsonMode: false,
      temperature: 0.2,
      model: 'deepseek-v4-pro'
    });
  });

  it('normaliza a saida com provider e usage sempre presentes', async () => {
    mocks.deepseekChat.mockResolvedValue({ content: 'oi', model: 'm' }); // sem usage

    const res = await runText({ system: 's', user: 'u' });

    expect(res).toEqual({ content: 'oi', model: 'm', provider: 'deepseek', usage: {} });
  });

  it('recusa provedor desconhecido em vez de cair em um padrao silencioso', async () => {
    await expect(runText({ system: 's', user: 'u', provider: 'chatgpt' }))
      .rejects.toThrow('Provedor de texto desconhecido: chatgpt');
  });

  it('ignora um AI_TEXT_PROVIDER invalido e mantem o padrao', () => {
    process.env.AI_TEXT_PROVIDER = 'inexistente';
    expect(resolveTextProvider()).toBe('deepseek');
  });

  it('anuncia os provedores disponiveis', () => {
    expect(listTextProviders()).toEqual(['deepseek', 'gemini']);
  });
});
