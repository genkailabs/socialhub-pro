import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Teste controlado do fallback ponta a ponta: NADA é mockado entre a skill e a
// rede. runSkill, runText, o adapter do DeepSeek e o do Groq são os de verdade;
// o único ponto falsificado é `fetch`, que é onde a rede começa.
//
// É o teste que responde "o Groq responde mesmo quando o DeepSeek cai, e o log
// registra o motivo?" sem precisar de chave nem gastar dinheiro.

const mocks = vi.hoisted(() => ({ checkLimit: vi.fn() }));
vi.mock('@/lib/ai/limits', () => ({ checkLimit: mocks.checkLimit }));

import { defineSkill } from '@/lib/ai/skills/registry';
import { runSkill } from '@/lib/ai/skills/run';
import { DEFAULT_GROQ_MODEL } from '@/lib/ai/groq';

const skill = defineSkill({
  id: 'teste-fallback',
  version: 1,
  description: 'Skill para o teste controlado de fallback',
  inputSchema: z.object({ topico: z.string().min(1) }),
  outputSchema: z.object({ titulo: z.string(), itens: z.array(z.string()) }),
  maxTokens: 2000,
  buildPrompt: ({ topico }) => ({ system: 'sistema', user: `tema: ${topico}` })
});

const BOM = JSON.stringify({ titulo: 'Funcionou', itens: ['a', 'b'] });

// Uma resposta no formato da OpenAI, que é o que os dois provedores falam.
function respostaOk(content, finish = 'stop') {
  return {
    ok: true,
    statusText: 'OK',
    json: async () => ({
      choices: [{ message: { content }, finish_reason: finish }],
      usage: { prompt_tokens: 120, completion_tokens: 60 }
    })
  };
}

function makeSupabase() {
  const linhas = [];
  const insert = vi.fn(async (row) => { linhas.push(row); return { error: null }; });
  return { supabase: { from: vi.fn(() => ({ insert })) }, linhas };
}

// Encaminha cada chamada de fetch para o roteiro combinado, por host.
function roteirizarFetch({ deepseek, groq }) {
  const chamadas = [];
  const dsFila = [...deepseek];
  const grqFila = [...groq];
  vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
    const alvo = String(url).includes('groq.com') ? 'groq' : 'deepseek';
    chamadas.push(alvo);
    const proxima = alvo === 'groq' ? grqFila.shift() : dsFila.shift();
    if (typeof proxima === 'function') return proxima();
    if (!proxima) throw new Error(`Roteiro de fetch acabou para ${alvo}`);
    return proxima;
  });
  return chamadas;
}

const ctx = () => ({ brandId: 'brand-1', userId: 'user-1' });

describe('teste controlado: DeepSeek falha, Groq atende', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkLimit.mockResolvedValue({ allowed: true });
    process.env.DEEPSEEK_API_KEY = 'ds-teste';
    process.env.GROQ_API_KEY = 'gsk-teste';
    process.env.AI_TEXT_FALLBACK = 'groq';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AI_TEXT_FALLBACK;
    delete process.env.GROQ_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
  });

  // Caso 1 do spec: o DeepSeek nem responde.
  it('provedor fora do ar: o Groq responde na mesma tentativa', async () => {
    const { supabase, linhas } = makeSupabase();
    const chamadas = roteirizarFetch({
      deepseek: [() => Promise.reject(new Error('socket hang up'))],
      groq: [respostaOk(BOM)]
    });

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(chamadas).toEqual(['deepseek', 'groq']);
    expect(res.provider).toBe('groq');
    expect(res.model).toBe(DEFAULT_GROQ_MODEL);
    expect(res.attempts).toBe(1);
    expect(linhas.at(-1)).toMatchObject({ status: 'success', provider: 'groq' });
  });

  // Erro 4xx (chave/limite) não é 5xx nem timeout — e mesmo assim cai no plano B.
  it('erro 4xx da API tambem aciona o fallback', async () => {
    const { supabase } = makeSupabase();
    const chamadas = roteirizarFetch({
      deepseek: [{ ok: false, statusText: 'Too Many Requests', json: async () => ({ error: { message: 'rate limit' } }) }],
      groq: [respostaOk(BOM)]
    });

    expect((await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).provider).toBe('groq');
    expect(chamadas).toEqual(['deepseek', 'groq']);
  });

  it('resposta vazia do DeepSeek tambem aciona o fallback', async () => {
    const { supabase } = makeSupabase();
    const chamadas = roteirizarFetch({
      deepseek: [respostaOk('   ')],
      groq: [respostaOk(BOM)]
    });

    expect((await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).provider).toBe('groq');
    expect(chamadas).toEqual(['deepseek', 'groq']);
  });

  // O ponto levantado na revisao: JSON invalido nao pode parar na segunda
  // tentativa do DeepSeek. Depois das duas, o Groq tem de entrar.
  it('JSON invalido nas duas do DeepSeek: a terceira vai no Groq', async () => {
    const { supabase, linhas } = makeSupabase();
    const chamadas = roteirizarFetch({
      deepseek: [respostaOk('isto nao e json'), respostaOk('{"titulo": 42}')],
      groq: [respostaOk(BOM)]
    });

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(chamadas).toEqual(['deepseek', 'deepseek', 'groq']);
    expect(res).toMatchObject({ provider: 'groq', attempts: 3 });
    // O motivo de cada queda fica no log, em ordem.
    expect(linhas[0]).toMatchObject({ status: 'error', provider: 'deepseek', retry_attempt: 1 });
    expect(linhas[0].error).toContain('nao era JSON');
    expect(linhas[1]).toMatchObject({ status: 'error', provider: 'deepseek', retry_attempt: 2 });
    expect(linhas[2]).toMatchObject({ status: 'success', provider: 'groq', retry_attempt: 3 });
  });

  it('resposta cortada nas duas do DeepSeek: a terceira vai no Groq', async () => {
    const { supabase, linhas } = makeSupabase();
    const chamadas = roteirizarFetch({
      deepseek: [respostaOk('{"titulo":"Oi","itens":["a', 'length'), respostaOk('{"titulo":"Oi","itens":["a', 'length')],
      groq: [respostaOk(BOM)]
    });

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(chamadas).toEqual(['deepseek', 'deepseek', 'groq']);
    expect(res.provider).toBe('groq');
    expect(linhas[0].error).toContain('cortada no limite de 2000');
    expect(linhas[1].error).toContain('cortada no limite de 4000');
    expect(linhas[2]).toMatchObject({ status: 'success', provider: 'groq' });
  });

  // O modelo pertence ao provedor: mandar o do DeepSeek ao Groq seria pedir
  // um modelo que a outra API nao conhece.
  it('a chamada ao Groq usa o modelo do Groq e a chave do Groq', async () => {
    const { supabase } = makeSupabase();
    const comModelo = defineSkill({
      ...skill,
      id: 'teste-fallback-modelo',
      provider: 'deepseek',
      model: 'deepseek-v4-pro'
    });
    roteirizarFetch({
      deepseek: [() => Promise.reject(new Error('caiu'))],
      groq: [respostaOk(BOM)]
    });

    await runSkill({ skill: comModelo, input: { topico: 'a' }, supabase, ...ctx() });

    const [urlGroq, optGroq] = global.fetch.mock.calls[1];
    const corpo = JSON.parse(optGroq.body);
    expect(String(urlGroq)).toContain('api.groq.com');
    expect(optGroq.headers.Authorization).toBe('Bearer gsk-teste');
    expect(corpo.model).toBe(DEFAULT_GROQ_MODEL);
    expect(corpo.model).not.toContain('deepseek');
    expect(corpo.response_format).toEqual({ type: 'json_object' });
  });

  it('sem AI_TEXT_FALLBACK, o Groq nunca e chamado', async () => {
    delete process.env.AI_TEXT_FALLBACK;
    const { supabase } = makeSupabase();
    const chamadas = roteirizarFetch({
      deepseek: [() => Promise.reject(new Error('caiu'))],
      groq: [respostaOk(BOM)]
    });

    await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow('caiu');
    expect(chamadas).toEqual(['deepseek']);
  });

  // Se o plano B tambem cai, o erro que sobe e o do principal -- e o log
  // precisa registrar a falha, senao a geracao some sem deixar rastro.
  it('os dois caem: sobe o erro do principal e o log registra', async () => {
    const { supabase, linhas } = makeSupabase();
    roteirizarFetch({
      deepseek: [() => Promise.reject(new Error('DeepSeek fora do ar'))],
      groq: [() => Promise.reject(new Error('Groq fora do ar'))]
    });

    await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() }))
      .rejects.toThrow('DeepSeek fora do ar');

    expect(linhas[0]).toMatchObject({ status: 'error', retry_attempt: 1 });
    expect(linhas[0].error).toContain('DeepSeek fora do ar');
  });
});
