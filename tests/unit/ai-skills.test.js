import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({ runText: vi.fn(), checkLimit: vi.fn() }));

vi.mock('@/lib/ai/provider', () => ({ runText: mocks.runText }));
vi.mock('@/lib/ai/limits', () => ({ checkLimit: mocks.checkLimit }));

import { defineSkill } from '@/lib/ai/skills/registry';
import { runSkill } from '@/lib/ai/skills/run';

const skill = defineSkill({
  id: 'teste',
  version: 1,
  description: 'Skill de teste',
  inputSchema: z.object({ topico: z.string().min(1) }),
  outputSchema: z.object({ titulo: z.string(), itens: z.array(z.string()) }),
  maxTokens: 4096,
  buildPrompt: ({ topico }) => ({ system: 'sistema', user: `tema: ${topico}` })
});

const OK = JSON.stringify({ titulo: 'Oi', itens: ['a'] });

function makeSupabase() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  return { supabase: { from: vi.fn(() => ({ insert })) }, insert };
}

const ctx = () => ({ brandId: 'brand-1', userId: 'user-1' });

describe('defineSkill', () => {
  it('recusa uma skill sem os campos do contrato', () => {
    expect(() => defineSkill({ id: 'x' })).toThrow('Skill x:');
  });

  it('exige versao inteira para o custo ser rastreavel por versao', () => {
    expect(() => defineSkill({ ...skill, version: '1' })).toThrow('version');
  });
});

describe('runSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkLimit.mockResolvedValue({ allowed: true });
    mocks.runText.mockResolvedValue({
      content: OK,
      usage: { prompt_tokens: 100, completion_tokens: 50 },
      model: 'deepseek-v4-flash',
      provider: 'deepseek'
    });
  });

  it('valida a entrada antes de gastar IA', async () => {
    const { supabase } = makeSupabase();

    await expect(runSkill({ skill, input: { topico: '' }, supabase, ...ctx() }))
      .rejects.toThrow('Entrada invalida para a skill teste');

    expect(mocks.runText).not.toHaveBeenCalled();
  });

  it('devolve a saida validada e o custo calculado', async () => {
    const { supabase } = makeSupabase();

    const res = await runSkill({ skill, input: { topico: 'ansiedade' }, supabase, ...ctx() });

    expect(res.data).toEqual({ titulo: 'Oi', itens: ['a'] });
    expect(res.provider).toBe('deepseek');
    expect(res.cost).toBeGreaterThan(0);
  });

  // A skill não escolhe provedor: quem decide é a camada de provider.
  it('nao passa provedor quando a skill nao fixa um', async () => {
    const { supabase } = makeSupabase();

    await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(mocks.runText).toHaveBeenCalledWith(expect.objectContaining({
      system: 'sistema',
      user: 'tema: a',
      jsonMode: true,
      maxTokens: 4096
    }));
    expect(mocks.runText.mock.calls[0][0].provider).toBeUndefined();
  });

  it('registra o custo com skill e versao', async () => {
    const { supabase, insert } = makeSupabase();

    await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(supabase.from).toHaveBeenCalledWith('generation_jobs');
    expect(insert.mock.calls[0][0]).toMatchObject({
      brand_id: 'brand-1',
      user_id: 'user-1',
      skill_id: 'teste',
      skill_version: 1,
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      input_tokens: 100,
      output_tokens: 50,
      status: 'success'
    });
  });

  it('tenta de novo quando a IA devolve JSON quebrado', async () => {
    const { supabase } = makeSupabase();
    mocks.runText
      .mockResolvedValueOnce({ content: 'isso nao e json', usage: {}, model: 'm', provider: 'deepseek' })
      .mockResolvedValueOnce({ content: OK, usage: {}, model: 'm', provider: 'deepseek' });

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(mocks.runText).toHaveBeenCalledTimes(2);
    expect(res.data.titulo).toBe('Oi');
  });

  it('aproveita JSON dentro de bloco Markdown sem gastar uma segunda tentativa', async () => {
    const { supabase } = makeSupabase();
    mocks.runText.mockResolvedValueOnce({ content: `Aqui está o plano:\n\n\`\`\`json\n${OK}\n\`\`\``, usage: {}, model: 'm', provider: 'deepseek' });

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(res.data.titulo).toBe('Oi');
    expect(mocks.runText).toHaveBeenCalledTimes(1);
  });

  it('tenta de novo quando a saida nao bate com o schema', async () => {
    const { supabase } = makeSupabase();
    mocks.runText
      .mockResolvedValueOnce({ content: JSON.stringify({ titulo: 'Oi' }), usage: {}, model: 'm', provider: 'deepseek' })
      .mockResolvedValueOnce({ content: OK, usage: {}, model: 'm', provider: 'deepseek' });

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(res.data.itens).toEqual(['a']);
  });

  it('desiste depois da segunda falha e registra o erro', async () => {
    const { supabase, insert } = makeSupabase();
    mocks.runText.mockResolvedValue({ content: 'lixo', usage: {}, model: 'm', provider: 'deepseek' });

    await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() }))
      .rejects.toThrow('A skill teste nao devolveu um resultado valido');

    expect(mocks.runText).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0][0]).toMatchObject({ status: 'error', skill_id: 'teste' });
  });

  // Custo tem que aparecer mesmo quando a chamada falha (RF-15).
  it('registra o custo quando o provedor derruba a chamada', async () => {
    const { supabase, insert } = makeSupabase();
    mocks.runText.mockRejectedValue(new Error('DeepSeek: 429'));

    await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow('429');

    expect(insert.mock.calls[0][0]).toMatchObject({ status: 'error', error: 'DeepSeek: 429' });
  });

  it('respeita o limite e nem chama a IA', async () => {
    const { supabase } = makeSupabase();
    mocks.checkLimit.mockResolvedValue({ allowed: false, reason: 'Limite mensal de teste atingido.' });

    await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() }))
      .rejects.toThrow('Limite mensal de teste atingido.');

    expect(mocks.runText).not.toHaveBeenCalled();
  });

  it('nao deixa uma falha de log derrubar a geracao', async () => {
    const supabase = { from: vi.fn(() => ({ insert: vi.fn().mockRejectedValue(new Error('sem tabela')) })) };

    const res = await runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() });

    expect(res.data.titulo).toBe('Oi');
  });
});
