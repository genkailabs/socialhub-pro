import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  runSkill: vi.fn(),
  revalidatePath: vi.fn(),
  renderNode: vi.fn(),
  resolvePalette: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/ai/skills/run', () => ({ runSkill: mocks.runSkill }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/ai/render', () => ({ renderNode: mocks.renderNode }));
vi.mock('@/lib/ai/templates', () => ({ resolvePalette: mocks.resolvePalette }));

import { produceApprovedPlanItems, produceFromPlanItem } from '@/lib/content-actions';

const item = {
  id: 'item-1', plan_id: 'plan-1', date: '2026-07-20', format: 'reel', topic: 'Tema',
  title: 'Titulo', objective: 'Ensinar', pillar: 'Educacao', stage: 'descoberta',
  cta: 'Comente', status: 'approved', post_id: null, editorial_plans: { brand_id: 'brand-1' }
};

function queryResult(data) {
  return { eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) })) };
}

function productionSupabase({ planItem = item, postError = null, acquiredItem = { id: 'item-1' }, timeline = [] } = {}) {
  const updateCalls = [];
  const itemUpdate = vi.fn((payload) => {
    const call = { payload, conditions: [] };
    updateCalls.push(call);
    timeline.push(`update:${payload.status}`);
    const builder = {
      eq: vi.fn((column, value) => {
        call.conditions.push([column, value]);
        return builder;
      }),
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: acquiredItem, error: null })
      }))
    };
    return builder;
  });
  const postInsert = vi.fn(() => ({
    select: () => ({ maybeSingle: vi.fn().mockImplementation(async () => {
      timeline.push('post-insert');
      return { data: postError ? null : { id: 'post-1' }, error: postError };
    }) })
  }));
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn((table) => {
      if (table === 'editorial_plan_items') return { select: () => queryResult(planItem), update: itemUpdate };
      if (table === 'brands') return { select: () => queryResult({ id: 'brand-1', name: 'Marca', color: '#123456' }) };
      if (table === 'brand_kits') return { select: () => queryResult(null) };
      if (table === 'posts') return {
        select: () => ({ eq: () => ({ order: () => ({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) }),
        insert: postInsert
      };
      throw new Error(`Tabela inesperada: ${table}`);
    })
  };
  return { supabase, itemUpdate, updateCalls };
}

describe('produceFromPlanItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runSkill.mockResolvedValue({ data: { script: 'Roteiro', caption: 'Legenda' }, cost: 0.01 });
  });

  it('marca em producao antes da IA e deixa pronto somente depois de salvar o post', async () => {
    const timeline = [];
    const { supabase, updateCalls } = productionSupabase({ timeline });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockImplementation(async () => {
      timeline.push('runSkill');
      return { data: { script: 'Roteiro', caption: 'Legenda' }, cost: 0.01 };
    });

    await expect(produceFromPlanItem({ itemId: 'item-1' })).resolves.toEqual(expect.objectContaining({ ok: true, postId: 'post-1' }));

    expect(updateCalls.map((call) => call.payload)).toEqual([
      { status: 'in_production', production_error: null },
      { post_id: 'post-1', status: 'ready', production_error: null }
    ]);
    expect(updateCalls[0].conditions).toEqual([['id', 'item-1'], ['status', 'approved']]);
    expect(timeline.indexOf('update:in_production')).toBeLessThan(timeline.indexOf('runSkill'));
    expect(timeline.indexOf('post-insert')).toBeLessThan(timeline.indexOf('update:ready'));
  });

  it('nao chama IA quando a aquisicao condicional nao atualiza nenhum tema', async () => {
    const { supabase } = productionSupabase({ acquiredItem: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(produceFromPlanItem({ itemId: 'item-1' }))
      .resolves.toEqual({ error: 'Aprove o tema antes de produzir o conteúdo.' });

    expect(mocks.runSkill).not.toHaveBeenCalled();
  });

  it('restaura aprovado e permite uma segunda tentativa real apos falha', async () => {
    const { supabase, updateCalls } = productionSupabase();
    mocks.createClient.mockResolvedValue(supabase);
    mocks.runSkill.mockRejectedValueOnce(new Error('provedor indisponivel'));

    await expect(produceFromPlanItem({ itemId: 'item-1' })).resolves.toEqual({ error: 'provedor indisponivel' });
    await expect(produceFromPlanItem({ itemId: 'item-1' })).resolves.toEqual(expect.objectContaining({ ok: true, postId: 'post-1' }));

    expect(updateCalls.map((call) => call.payload)).toEqual([
      { status: 'in_production', production_error: null },
      { status: 'approved', production_error: 'provedor indisponivel' },
      { status: 'in_production', production_error: null },
      { post_id: 'post-1', status: 'ready', production_error: null }
    ]);
  });
});

describe('produceApprovedPlanItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runSkill.mockResolvedValue({ data: { script: 'Roteiro', caption: 'Legenda' }, cost: 0.01 });
  });

  it('seleciona somente aprovados e continua os proximos quando um item falha', async () => {
    const planEq = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'item-1' }, { id: 'item-2' }], error: null }) }));
    const listSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: planEq })) }))
    };
    const first = productionSupabase();
    const second = productionSupabase();
    mocks.createClient.mockResolvedValueOnce(listSupabase).mockResolvedValueOnce(first.supabase).mockResolvedValueOnce(second.supabase);
    mocks.runSkill.mockRejectedValueOnce(new Error('falha do primeiro'));

    await expect(produceApprovedPlanItems({ planId: 'plan-1' })).resolves.toEqual({
      results: [
        { itemId: 'item-1', ok: false, error: 'falha do primeiro' },
        { itemId: 'item-2', ok: true }
      ]
    });

    expect(planEq).toHaveBeenCalledWith('plan_id', 'plan-1');
    expect(planEq.mock.results[0].value.eq).toHaveBeenCalledWith('status', 'approved');
    expect(second.updateCalls.map((call) => call.payload)).toContainEqual({ post_id: 'post-1', status: 'ready', production_error: null });
  });
});
