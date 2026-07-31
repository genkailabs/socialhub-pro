import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({ runText: vi.fn(), checkLimit: vi.fn() }));

vi.mock('@/lib/ai/provider', () => ({ runText: mocks.runText }));
vi.mock('@/lib/ai/limits', () => ({ checkLimit: mocks.checkLimit }));

import { defineSkill } from '@/lib/ai/skills/registry';
import { DEFAULT_SKILL_MAX_TOKENS, runSkill } from '@/lib/ai/skills/run';

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
    expect(mocks.runText.mock.calls[1][0].system).toContain('itens');
    expect(mocks.runText.mock.calls[1][0].user).toContain('CORRECAO OBRIGATORIA');
  });

  it('desiste depois da segunda falha e registra o erro', async () => {
    const { supabase, insert } = makeSupabase();
    mocks.runText.mockResolvedValue({ content: 'lixo', usage: {}, model: 'm', provider: 'deepseek' });

    await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() }))
      .rejects.toThrow('A skill teste nao devolveu um resultado valido');

    expect(mocks.runText).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0][0]).toMatchObject({ status: 'error', skill_id: 'teste' });
  });

  // Bug de producao (2026-07-21): o editorial-planner falhou duas vezes com
  // output_tokens batendo exatamente no teto. A resposta nao era invalida — ela
  // tinha sido cortada, e repetir a mesma chamada dava o mesmo corte.
  describe('resposta cortada no teto de tokens', () => {
    const cortada = { content: '{"titulo":"Oi","itens":["a', usage: { completion_tokens: 4096 }, model: 'm', provider: 'deepseek', finishReason: 'length' };

    it('diz que foi corte, nao que a resposta era invalida', async () => {
      const { supabase, insert } = makeSupabase();
      mocks.runText.mockResolvedValue(cortada);

      await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() }))
        .rejects.toThrow('resposta cortada no limite de');

      expect(insert.mock.calls[0][0].error).toContain('cortada no limite de 4096');
    });

    it('a segunda tentativa vai com mais espaco, senao repete o mesmo corte', async () => {
      const { supabase } = makeSupabase();
      mocks.runText.mockResolvedValue(cortada);

      await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow();

      expect(mocks.runText.mock.calls[0][0].maxTokens).toBe(4096);
      expect(mocks.runText.mock.calls[1][0].maxTokens).toBe(8000);
    });

    // Em produção, post-producer, content-strategy e story-planner omitiam
    // maxTokens, caíam no padrão 1200 do provedor e eram cortadas exatamente
    // ali — cinco falhas registradas, cada uma queimando uma tentativa. O teto
    // de quem não declara passa a ser decisão nossa, e o log diz o número.
    it('skill sem maxTokens usa o teto padrao, nao o do provedor', async () => {
      const { supabase, insert } = makeSupabase();
      const semTeto = defineSkill({
        id: 'sem-teto',
        version: 1,
        description: 'Skill sem teto declarado',
        inputSchema: z.object({ topico: z.string().min(1) }),
        outputSchema: z.object({ titulo: z.string() }),
        buildPrompt: () => ({ system: 's', user: 'u' })
      });
      mocks.runText.mockResolvedValue(cortada);

      await expect(runSkill({ skill: semTeto, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow();

      expect(mocks.runText.mock.calls[0][0].maxTokens).toBe(DEFAULT_SKILL_MAX_TOKENS);
      expect(insert.mock.calls[0][0].error).toContain(`cortada no limite de ${DEFAULT_SKILL_MAX_TOKENS}`);
      expect(insert.mock.calls[0][0].error).not.toContain('undefined');
    });

    it('nao cresce o teto quando o problema foi a saida, nao o espaco', async () => {
      const { supabase } = makeSupabase();
      mocks.runText.mockResolvedValue({ content: 'lixo', usage: {}, model: 'm', provider: 'deepseek', finishReason: 'stop' });

      await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow();

      expect(mocks.runText.mock.calls[1][0].maxTokens).toBe(4096);
    });
  });

  // Bug de producao (2026-07-31): carousel-directions falhou duas vezes seguidas
  // com `headlineOptions.N.subheadline: Invalid input`. O modelo mandava `null`
  // no campo opcional, e `.default()` do Zod so cobre `undefined` — um campo que
  // nem era obrigatorio derrubava a resposta inteira e queimava 28s de retry.
  describe('null onde o schema tem default', () => {
    const comOpcional = defineSkill({
      id: 'com-opcional',
      version: 1,
      description: 'Skill com campo opcional',
      inputSchema: z.object({ topico: z.string().min(1) }),
      outputSchema: z.object({
        titulo: z.string(),
        apoio: z.string().max(190).default(''),
        itens: z.array(z.string()).default([])
      }),
      buildPrompt: () => ({ system: 's', user: 'u' })
    });

    it('aceita o null e nao gasta uma segunda tentativa', async () => {
      const { supabase } = makeSupabase();
      mocks.runText.mockResolvedValue({
        content: JSON.stringify({ titulo: 'Oi', apoio: null, itens: null }),
        usage: {}, model: 'm', provider: 'deepseek'
      });

      const res = await runSkill({ skill: comOpcional, input: { topico: 'a' }, supabase, ...ctx() });

      expect(res.data).toEqual({ titulo: 'Oi', apoio: '', itens: [] });
      expect(mocks.runText).toHaveBeenCalledTimes(1);
    });

    it('conserta o null dentro de lista de objetos', async () => {
      const comLista = defineSkill({
        id: 'com-lista',
        version: 1,
        description: 'Skill com lista de objetos',
        inputSchema: z.object({ topico: z.string().min(1) }),
        outputSchema: z.object({
          opcoes: z.array(z.object({ titulo: z.string(), apoio: z.string().default('') })).length(2)
        }),
        buildPrompt: () => ({ system: 's', user: 'u' })
      });
      const { supabase } = makeSupabase();
      mocks.runText.mockResolvedValue({
        content: JSON.stringify({ opcoes: [{ titulo: 'a', apoio: null }, { titulo: 'b', apoio: 'ok' }] }),
        usage: {}, model: 'm', provider: 'deepseek'
      });

      const res = await runSkill({ skill: comLista, input: { topico: 'a' }, supabase, ...ctx() });

      expect(res.data.opcoes).toEqual([{ titulo: 'a', apoio: '' }, { titulo: 'b', apoio: 'ok' }]);
      expect(mocks.runText).toHaveBeenCalledTimes(1);
    });

    // story-planner declara `cta: z.string().nullable()`. Trocar null por
    // undefined em toda a arvore quebraria justamente quem pediu null.
    it('nao mexe no null que o schema aceita de proposito', async () => {
      const comNullable = defineSkill({
        id: 'com-nullable',
        version: 1,
        description: 'Skill com campo nullable',
        inputSchema: z.object({ topico: z.string().min(1) }),
        outputSchema: z.object({ cta: z.string().nullable() }),
        buildPrompt: () => ({ system: 's', user: 'u' })
      });
      const { supabase } = makeSupabase();
      mocks.runText.mockResolvedValue({ content: JSON.stringify({ cta: null }), usage: {}, model: 'm', provider: 'deepseek' });

      const res = await runSkill({ skill: comNullable, input: { topico: 'a' }, supabase, ...ctx() });

      expect(res.data).toEqual({ cta: null });
      expect(mocks.runText).toHaveBeenCalledTimes(1);
    });
  });

  // A razao da rejeicao vira o prompt de correcao da tentativa seguinte. No
  // build, a mensagem do Zod degradava para "Invalid input" seco: o modelo
  // recebia o nome do campo e nenhuma pista, e repetia o mesmo erro. A razao
  // passa a ser montada por nos, a partir do codigo da issue e do valor real.
  describe('razao da rejeicao', () => {
    it('diz o tipo esperado e o que veio no lugar', async () => {
      const { supabase, insert } = makeSupabase();
      mocks.runText.mockResolvedValue({
        content: JSON.stringify({ titulo: 42, itens: ['a'] }),
        usage: {}, model: 'm', provider: 'deepseek'
      });

      await expect(runSkill({ skill, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow();

      const erro = insert.mock.calls[0][0].error;
      expect(erro).toContain('titulo');
      expect(erro).toContain('string');
      expect(erro).toContain('number');
    });

    it('diz o limite quando o texto passou do maximo', async () => {
      const comLimite = defineSkill({
        id: 'com-limite',
        version: 1,
        description: 'Skill com limite de texto',
        inputSchema: z.object({ topico: z.string().min(1) }),
        outputSchema: z.object({ titulo: z.string().max(10) }),
        buildPrompt: () => ({ system: 's', user: 'u' })
      });
      const { supabase, insert } = makeSupabase();
      mocks.runText.mockResolvedValue({
        content: JSON.stringify({ titulo: 'texto muito maior que o permitido' }),
        usage: {}, model: 'm', provider: 'deepseek'
      });

      await expect(runSkill({ skill: comLimite, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow();

      const erro = insert.mock.calls[0][0].error;
      expect(erro).toContain('10');
      expect(erro).toContain('33');
    });

    it('lista os valores aceitos quando o campo e fechado', async () => {
      const comEnum = defineSkill({
        id: 'com-enum',
        version: 1,
        description: 'Skill com enum',
        inputSchema: z.object({ topico: z.string().min(1) }),
        outputSchema: z.object({ angulo: z.enum(['erro', 'processo']) }),
        buildPrompt: () => ({ system: 's', user: 'u' })
      });
      const { supabase, insert } = makeSupabase();
      mocks.runText.mockResolvedValue({
        content: JSON.stringify({ angulo: 'outro' }),
        usage: {}, model: 'm', provider: 'deepseek'
      });

      await expect(runSkill({ skill: comEnum, input: { topico: 'a' }, supabase, ...ctx() })).rejects.toThrow();

      expect(insert.mock.calls[0][0].error).toContain('erro | processo');
    });
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
