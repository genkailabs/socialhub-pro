import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deepseekChat: vi.fn()
}));

vi.mock('@/lib/ai/deepseek', () => ({ deepseekChat: mocks.deepseekChat }));

import { runText, resolveTextProvider, listTextProviders } from '@/lib/ai/provider';

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

    expect(res).toEqual({ content: 'oi', model: 'm', provider: 'deepseek', usage: {} });
  });

  it('recusa provedor desconhecido em vez de cair em um padrao silencioso', async () => {
    await expect(runText({ system: 's', user: 'u', provider: 'gemini' }))
      .rejects.toThrow('Provedor de texto desconhecido: gemini');
  });

  it('ignora um AI_TEXT_PROVIDER invalido e mantem o padrao', () => {
    process.env.AI_TEXT_PROVIDER = 'gemini';
    expect(resolveTextProvider()).toBe('deepseek');
  });

  it('anuncia os provedores disponiveis (so DeepSeek escreve)', () => {
    expect(listTextProviders()).toEqual(['deepseek']);
  });
});
