import { describe, it, expect, vi, afterEach } from 'vitest';
import { deepseekChat } from '@/lib/ai/deepseek';

// A família v4 raciocina por padrão, e o raciocínio consome o MESMO orçamento de
// `max_tokens` que a resposta. Medido no prompt real de post: 1318 tokens de
// raciocínio + 282 de conteúdo = os 1600 do teto, JSON cortado no meio e a
// interface mostrando "A IA não retornou JSON válido".
//
// Este teste existe porque o parâmetro é fácil de perder num refactor e a falha
// que ele causa não parece configuração: parece a IA escrevendo errado.

function mockOk() {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: '{"headline":"oi"}' }, finish_reason: 'stop' }],
      usage: { completion_tokens: 10 }
    })
  }));
}

function bodyOf(fetchMock) {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('deepseekChat: modo de raciocínio', () => {
  it('desliga o raciocínio por padrão', async () => {
    const f = mockOk();
    vi.stubGlobal('fetch', f);
    process.env.DEEPSEEK_API_KEY = 'chave-de-teste';

    await deepseekChat({ system: 's', user: 'u' });
    expect(bodyOf(f).thinking).toEqual({ type: 'disabled' });
  });

  it('permite ligar de propósito, para quem pedir', async () => {
    const f = mockOk();
    vi.stubGlobal('fetch', f);
    process.env.DEEPSEEK_API_KEY = 'chave-de-teste';

    await deepseekChat({ system: 's', user: 'u', thinking: true });
    expect(bodyOf(f).thinking).toEqual({ type: 'enabled' });
  });

  it('limita a espera pelo provedor e traduz timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));
    process.env.DEEPSEEK_API_KEY = 'chave-de-teste';

    await expect(deepseekChat({ system: 's', user: 'u' })).rejects.toThrow(/excedeu o tempo limite/);
  });
});
