import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  runSkill: vi.fn(),
  revalidatePath: vi.fn(),
  summarizeDnaSignals: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/ai/skills/run', () => ({ runSkill: mocks.runSkill }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/dna-signals', () => ({ summarizeDnaSignals: mocks.summarizeDnaSignals }));

import {
  approveAllPlanItems,
  createPlanItem,
  generateWeekPlan,
  removePlanItem,
  replacePlanItem,
  restorePlanItemVersion,
  setPlanItemStatus,
  updatePlanItem
} from '@/lib/planning-actions';

function loggedSupabase() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }))
  };
}

describe('setPlanItemStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bloqueia estados controlados pela producao quando enviados pelo cliente', async () => {
    const supabase = loggedSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(setPlanItemStatus({ itemId: 'item-1', status: 'in_production' }))
      .resolves.toEqual({ error: 'Estado inválido.' });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('também bloqueia ready quando enviado pelo cliente', async () => {
    const supabase = loggedSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(setPlanItemStatus({ itemId: 'item-1', status: 'ready' }))
      .resolves.toEqual({ error: 'Estado inválido.' });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('updatePlanItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('edita somente os campos manuais e não chama IA', async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({ update }))
    };
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updatePlanItem({ itemId: 'item-1', patch: { title: 'Novo título', status: 'ready', regeneration_count: 9 } }))
      .resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ title: 'Novo título' });
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });
});

describe('createPlanItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria uma ideia manual apenas com os campos permitidos e sem chamar IA', async () => {
    const insert = vi.fn(() => ({ select: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'item-2' }, error: null }) }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'editorial_plan_items') return { insert };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);

    const res = await createPlanItem({
      planId: 'plan-1',
      values: {
        date: '2026-07-20', title: 'Tema manual', topic: 'Tema manual', format: 'reel',
        pillar: 'Educação', objective: 'Ensinar', summary: 'Resumo', hook: 'Gancho',
        cta: 'Comente', estimated_duration: '30 segundos', status: 'ready', regeneration_count: 99
      }
    });

    expect(res).toEqual({ ok: true, itemId: 'item-2' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      plan_id: 'plan-1', status: 'idea', regeneration_count: 0, title: 'Tema manual'
    }));
    expect(insert.mock.calls[0][0]).not.toHaveProperty('status', 'ready');
    expect(insert.mock.calls[0][0]).not.toHaveProperty('regeneration_count', 99);
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });
});

describe('approveAllPlanItems', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aprova em lote ideias atuais e propostas legadas, sem iniciar IA', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 'idea-1' }, { id: 'idea-2' }], error: null });
    const statusFilter = vi.fn(() => ({ select }));
    const planFilter = vi.fn(() => ({ in: statusFilter }));
    const update = vi.fn(() => ({ eq: planFilter }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({ update }))
    };
    mocks.createClient.mockResolvedValue(supabase);

    await expect(approveAllPlanItems({ planId: 'plan-1' })).resolves.toEqual({ ok: true, count: 2 });
    expect(update).toHaveBeenCalledWith({ status: 'approved' });
    expect(planFilter).toHaveBeenCalledWith('plan_id', 'plan-1');
    expect(statusFilter).toHaveBeenCalledWith('status', ['idea', 'proposed']);
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });
});

describe('removePlanItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita o item sem chamar IA', async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({ update }))
    };
    mocks.createClient.mockResolvedValue(supabase);

    await expect(removePlanItem({ itemId: 'item-1' })).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ status: 'rejected' });
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });
});

describe('restorePlanItemVersion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restaura a versao salva sem chamar IA', async () => {
    const version = {
      date: '2026-07-22', topic: 'Tema anterior', title: 'Versão anterior', format: 'carousel',
      pillar: 'Educação', stage: 'consideracao', objective: 'Ensinar', summary: 'Resumo',
      hook: 'Gancho', cta: 'Comente', target_audience: 'Donos', estimated_duration: '6 slides', rationale: 'Motivo anterior'
    };
    const versionSelect = vi.fn(() => ({ eq: versionIdFilter }));
    const versionIdFilter = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: version, error: null }) })) }));
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => table === 'editorial_plan_item_versions'
        ? { select: versionSelect }
        : { update })
    };
    mocks.createClient.mockResolvedValue(supabase);

    await expect(restorePlanItemVersion({ itemId: 'item-1', versionId: 'version-1' })).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(version);
    expect(versionSelect).toHaveBeenCalledWith(expect.stringContaining('topic'));
    expect(versionSelect).toHaveBeenCalledWith(expect.stringContaining('rationale'));
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });
});

describe('replacePlanItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bloqueia a quarta troca e orienta a edicao manual', async () => {
    const item = { id: 'item-1', regeneration_count: 3 };
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: item, error: null }) }) }) }))
    };
    mocks.createClient.mockResolvedValue(supabase);

    const res = await replacePlanItem({ itemId: 'item-1', instruction: 'Mais educativo' });

    expect(res.error).toContain('já foi trocada 3 vezes');
    expect(res.error).toContain('editar o conteúdo manualmente');
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });

  it('salva a versao anterior e troca somente o item selecionado', async () => {
    const item = {
      id: 'item-1', plan_id: 'plan-1', date: '2026-07-22', format: 'reel', topic: 'IA',
      title: 'Ideia anterior', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta',
      summary: 'Resumo anterior', hook: 'Gancho anterior', cta: 'Comente',
      target_audience: 'Donos de negócio', estimated_duration: '30 segundos', rationale: 'Motivo',
      status: 'proposed', regeneration_count: 1
    };
    const replacement = {
      date: '2026-07-20', format: 'carousel', topic: 'Automação', title: 'Nova ideia',
      objective: 'Ensinar melhor', pillar: 'Educação', stage: 'consideracao', summary: 'Novo resumo',
      hook: 'Novo gancho', cta: 'Salve', targetAudience: 'Gestores', estimatedDuration: '7 slides', rationale: 'Novo motivo'
    };
    const itemFilter = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: item, error: null }) }));
    const itemSelect = vi.fn(() => ({ eq: itemFilter }));
    const updateIdFilter = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateIdFilter }));
    const versionInsert = vi.fn(() => ({ select: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'version-2' }, error: null }) }) }));
    const planFilter = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { brand_id: 'brand-1', week_start: '2026-07-20' }, error: null }) }));
    const brandFilter = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Marca' }, error: null }) }));
    const kitFilter = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { tone: 'Direto', donts: ['Jargão'] }, error: null }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'editorial_plan_items') return { select: itemSelect, update };
        if (table === 'editorial_plan_item_versions') return { insert: versionInsert };
        if (table === 'editorial_plans') return { select: () => ({ eq: planFilter }) };
        if (table === 'brands') return { select: () => ({ eq: brandFilter }) };
        if (table === 'brand_kits') return { select: () => ({ eq: kitFilter }) };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: { items: [replacement] }, cost: 0.012 });

    await expect(replacePlanItem({ itemId: 'item-1', instruction: 'Quero algo mais educativo' }))
      .resolves.toEqual({ ok: true, itemId: 'item-1', cost: 0.012 });

    expect(versionInsert).toHaveBeenCalledWith(expect.objectContaining({
      planning_item_id: 'item-1', version_number: 2, date: '2026-07-22', topic: 'IA', pillar: 'Educação',
      stage: 'descoberta', rationale: 'Motivo', title: 'Ideia anterior', change_reason: 'Quero algo mais educativo'
    }));
    expect(itemSelect).toHaveBeenCalledWith(expect.stringContaining('plan_id'));
    expect(mocks.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      brandId: 'brand-1', userId: 'user-1', input: expect.objectContaining({
        brandName: 'Marca', weekStart: '2026-07-20', tone: 'Direto', donts: ['Jargão'],
        strategy: expect.objectContaining({ postsPerWeek: 1, formats: ['reel'] })
      })
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nova ideia', date: '2026-07-22', regeneration_count: 2, status: 'idea'
    }));
    expect(updateIdFilter).toHaveBeenCalledWith('id', 'item-1');
  });

  it('não grava histórico nem altera o item se a IA falhar', async () => {
    const item = { id: 'item-1', plan_id: 'plan-1', date: '2026-07-22', format: 'reel', title: 'Ideia', objective: 'Ensinar', pillar: 'Educação', regeneration_count: 1 };
    const versionInsert = vi.fn();
    const update = vi.fn();
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'editorial_plan_items') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: item, error: null }) }) }), update };
        if (table === 'editorial_plans') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { brand_id: 'brand-1', week_start: '2026-07-20' }, error: null }) }) }) };
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Marca' }, error: null }) }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) };
        if (table === 'editorial_plan_item_versions') return { insert: versionInsert };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockRejectedValue(new Error('provedor indisponível'));

    await expect(replacePlanItem({ itemId: 'item-1' })).resolves.toEqual({ error: 'provedor indisponível' });
    expect(versionInsert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('remove a versão nova se a atualização do item falhar', async () => {
    const item = { id: 'item-1', plan_id: 'plan-1', date: '2026-07-22', format: 'reel', title: 'Ideia', objective: 'Ensinar', pillar: 'Educação', regeneration_count: 1 };
    const versionInsert = vi.fn(() => ({ select: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'version-2' }, error: null }) }) }));
    const versionDelete = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'update falhou' } }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'editorial_plan_items') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: item, error: null }) }) }), update };
        if (table === 'editorial_plans') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { brand_id: 'brand-1', week_start: '2026-07-20' }, error: null }) }) }) };
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Marca' }, error: null }) }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) };
        if (table === 'editorial_plan_item_versions') return { insert: versionInsert, delete: versionDelete };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: { items: [{ format: 'reel', topic: 'Novo', title: 'Novo', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'CTA', targetAudience: 'Público', estimatedDuration: '30 segundos', rationale: 'Motivo' }] }, cost: 0.01 });

    await expect(replacePlanItem({ itemId: 'item-1' })).resolves.toEqual({ error: 'update falhou' });
    expect(versionDelete).toHaveBeenCalledWith();
    expect(versionDelete.mock.results[0].value.eq).toHaveBeenCalledWith('id', 'version-2');
  });
});

describe('generateWeekPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.summarizeDnaSignals.mockResolvedValue(null);
  });

  function regenerationSupabase({ previousIdeas = [], newInsertError = null, updatePlanError = null }) {
    const deleteStatus = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn()
      .mockResolvedValueOnce({ error: newInsertError })
      .mockResolvedValue({ error: null });
    const updatePlan = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: updatePlanError }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brand-1', name: 'Marca' } }) }) }) };
        if (table === 'content_strategies') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'Ensinar' }, pillars: [{ name: 'Educação', share: 100 }], formats: ['reel'], frequency: { postsPerWeek: 1 } }] }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
        if (table === 'posts') return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
        if (table === 'editorial_plans') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'plan-1' } }) }) }) }),
          update: updatePlan
        };
        if (table === 'editorial_plan_items') return {
          select: (fields) => fields.includes('regeneration_count')
            ? ({ eq: () => ({ eq: vi.fn().mockResolvedValue({ data: previousIdeas, error: null }) }) })
            : ({ eq: () => ({ neq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }),
          delete: () => ({ eq: () => ({ eq: deleteStatus }) }),
          insert
        };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    return { supabase, deleteStatus, insert };
  }

  const oneGeneratedItem = { weeklySummary: { mainFocus: 'Foco', description: 'Resumo' }, items: [{ date: '2026-07-20', format: 'reel', topic: 'Tema', title: 'Título', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'CTA', targetAudience: 'Público', estimatedDuration: '30 segundos', rationale: 'Motivo' }] };

  it('remove ideias novas se a atualização final do resumo falhar sem ideias anteriores', async () => {
    const { supabase, deleteStatus } = regenerationSupabase({ updatePlanError: { message: 'resumo falhou' } });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: oneGeneratedItem, cost: 0.01 });

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' }))
      .resolves.toEqual({ error: 'Não foi possível atualizar o plano: resumo falhou' });
    expect(deleteStatus).toHaveBeenCalledTimes(2);
  });

  it('restaura as ideias anteriores quando a inserção das novas falhar', async () => {
    const previousIdea = { date: '2026-07-21', format: 'reel', topic: 'Anterior', title: 'Anterior', status: 'idea', regeneration_count: 0, position: 0 };
    const { supabase, insert } = regenerationSupabase({ previousIdeas: [previousIdea], newInsertError: { message: 'insert falhou' } });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: oneGeneratedItem, cost: 0.01 });

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' }))
      .resolves.toEqual({ error: 'Não foi possível salvar os temas: insert falhou' });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1][0]).toEqual([expect.objectContaining({ title: 'Anterior', plan_id: 'plan-1' })]);
  });

  it('preserva itens decididos e pede à IA somente as vagas restantes', async () => {
    const generated = {
      weeklySummary: { mainFocus: 'Foco', description: 'Resumo' },
      items: [
        { date: '2026-07-22', format: 'reel', topic: 'Novo', title: 'Nova ideia', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'CTA', targetAudience: 'Público', estimatedDuration: '30 segundos', rationale: 'Motivo' },
        { date: '2026-07-23', format: 'reel', topic: 'Excesso', title: 'Ideia excedente', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'CTA', targetAudience: 'Público', estimatedDuration: '30 segundos', rationale: 'Motivo' }
      ]
    };
    const insert = vi.fn().mockResolvedValue({ error: null });
    const deleteStatus = vi.fn().mockResolvedValue({ error: null });
    const itemsPlanFilter = vi.fn(() => ({ neq: vi.fn().mockResolvedValue({
      data: [{ id: 'approved-1', title: 'Mantida 1', status: 'approved' }, { id: 'ready-1', title: 'Mantida 2', status: 'ready' }], error: null
    }) }));
    const deleteBuilder = { eq: vi.fn(() => ({ eq: deleteStatus })) };
    const previousIdeasFilter = vi.fn().mockResolvedValue({ data: [], error: null });
    const items = {
      select: vi.fn((fields) => fields.includes('regeneration_count')
        ? ({ eq: () => ({ eq: previousIdeasFilter }) })
        : ({ eq: itemsPlanFilter })),
      delete: vi.fn(() => deleteBuilder),
      insert
    };
    const existingPlanBrandFilter = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'plan-1' }, error: null }) })) }));
    const upsert = vi.fn(() => ({ select: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'plan-1' }, error: null }) }) }));
    const updatePlan = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brand-1', name: 'Marca' }, error: null }) }) }) };
        if (table === 'content_strategies') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'Ensinar' }, pillars: [{ name: 'Educação', share: 100 }], formats: ['reel'], frequency: { postsPerWeek: 3 } }] }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { tone: '', donts: [] }, error: null }) }) }) };
        if (table === 'posts') return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
        if (table === 'editorial_plans') return { select: () => ({ eq: existingPlanBrandFilter }), upsert, update: updatePlan };
        if (table === 'editorial_plan_items') return items;
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: generated, cost: 0.01 });

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' })).resolves.toEqual(expect.objectContaining({ ok: true, count: 1 }));
    expect(mocks.runSkill).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({
      strategy: expect.objectContaining({ postsPerWeek: 1 }), recentTopics: expect.arrayContaining(['Mantida 1', 'Mantida 2'])
    }) }));
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ title: 'Nova ideia' })]);
  });

  it('limpa as ideias antigas mesmo quando não há vagas para a IA', async () => {
    const deleteStatus = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brand-1', name: 'Marca' } }) }) }) };
        if (table === 'content_strategies') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'Ensinar' }, pillars: [{ name: 'Educação', share: 100 }], formats: ['reel'], frequency: { postsPerWeek: 3 } }] }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
        if (table === 'posts') return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
        if (table === 'editorial_plans') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'plan-1' } }) }) }) }) };
        if (table === 'editorial_plan_items') return {
          select: (fields) => fields.includes('regeneration_count')
            ? ({ eq: () => ({ eq: vi.fn().mockResolvedValue({ data: [] }) }) })
            : ({ eq: () => ({ neq: vi.fn().mockResolvedValue({ data: [{ status: 'approved' }, { status: 'ready' }, { status: 'in_production' }] }) }) }),
          delete: () => ({ eq: () => ({ eq: deleteStatus }) })
        };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' }))
      .resolves.toEqual({ ok: true, planId: 'plan-1', count: 0, preserved: 3, cost: 0 });
    expect(deleteStatus).toHaveBeenCalledWith('status', 'idea');
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });

  it('não insere novas ideias quando a exclusão das antigas falha', async () => {
    const deleteStatus = vi.fn().mockResolvedValue({ error: { message: 'delete falhou' } });
    const insert = vi.fn();
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brand-1', name: 'Marca' } }) }) }) };
        if (table === 'content_strategies') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'Ensinar' }, pillars: [{ name: 'Educação', share: 100 }], formats: ['reel'], frequency: { postsPerWeek: 1 } }] }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
        if (table === 'posts') return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
        if (table === 'editorial_plans') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'plan-1' } }) }) }) })
        };
        if (table === 'editorial_plan_items') return {
          select: (fields) => fields.includes('regeneration_count')
            ? ({ eq: () => ({ eq: vi.fn().mockResolvedValue({ data: [] }) }) })
            : ({ eq: () => ({ neq: vi.fn().mockResolvedValue({ data: [] }) }) }),
          delete: () => ({ eq: () => ({ eq: deleteStatus }) }), insert
        };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: { weeklySummary: { mainFocus: 'Foco', description: 'Resumo' }, items: [{ date: '2026-07-20', format: 'reel', topic: 'Tema', title: 'Título', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'CTA', targetAudience: 'Público', estimatedDuration: '30 segundos', rationale: 'Motivo' }] } });

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' })).resolves.toEqual({ error: 'Não foi possível limpar os temas anteriores: delete falhou' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('converte propostas legadas em ideias antes de regenerar a semana', async () => {
    const legacyProposal = { id: 'legacy-1', title: 'Tema antigo', status: 'proposed' };
    const legacyIdea = { date: '2026-07-21', format: 'reel', topic: 'Tema antigo', title: 'Tema antigo', status: 'idea', regeneration_count: 0, position: 0 };
    const statusFilter = vi.fn().mockResolvedValue({ error: null });
    const planFilter = vi.fn(() => ({ eq: statusFilter }));
    const normalizeLegacy = vi.fn(() => ({ eq: planFilter }));
    const previousIdeasFilter = vi.fn().mockResolvedValue({ data: [legacyIdea], error: null });
    const deleteStatus = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => {
        if (table === 'brands') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'brand-1', name: 'Marca' } }) }) }) };
        if (table === 'content_strategies') return { select: () => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'Ensinar' }, pillars: [{ name: 'Educação', share: 100 }], formats: ['reel'], frequency: { postsPerWeek: 1 } }] }) }) };
        if (table === 'brand_kits') return { select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
        if (table === 'posts') return { select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }) };
        if (table === 'editorial_plans') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'plan-1' } }) }) }) }),
          update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
        };
        if (table === 'editorial_plan_items') return {
          select: (fields) => fields.includes('regeneration_count')
            ? ({ eq: () => ({ eq: previousIdeasFilter }) })
            : ({ eq: () => ({ neq: vi.fn().mockResolvedValue({ data: [legacyProposal], error: null }) }) }),
          update: normalizeLegacy,
          delete: () => ({ eq: () => ({ eq: deleteStatus }) }),
          insert
        };
        throw new Error(`Tabela inesperada: ${table}`);
      })
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockResolvedValue({ data: {
      weeklySummary: { mainFocus: 'Foco', description: 'Resumo' },
      items: [{ date: '2026-07-22', format: 'reel', topic: 'Novo tema', title: 'Nova ideia', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'CTA', targetAudience: 'Público', estimatedDuration: '30 segundos', rationale: 'Motivo' }]
    }, cost: 0.01 });

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' }))
      .resolves.toMatchObject({ ok: true, count: 1 });

    expect(normalizeLegacy).toHaveBeenCalledWith({ status: 'idea' });
    expect(planFilter).toHaveBeenCalledWith('plan_id', 'plan-1');
    expect(statusFilter).toHaveBeenCalledWith('status', 'proposed');
    expect(mocks.runSkill).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ strategy: expect.objectContaining({ postsPerWeek: 1 }) }) }));
  });
});
