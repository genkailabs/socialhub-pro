import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import { getWeekPlan } from '@/lib/planning-data';

// Terça, 12:00 em São Paulo.
const AGORA = new Date('2026-07-21T15:00:00.000Z');
const HOJE = '2026-07-21';

function supabaseCom(items) {
  const tables = {
    editorial_plans: {
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'plan-1', week_start: HOJE }, error: null }) }) }) })
    },
    editorial_plan_items: {
      select: () => ({ eq: () => ({ order: () => ({ order: async () => ({ data: items, error: null }) }) }) })
    }
  };
  return { from: vi.fn((table) => tables[table]) };
}

describe('getWeekPlan — horário sugerido', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(AGORA); });
  afterEach(() => vi.useRealTimers());

  // O bug: a leitura recalculava o horário e devolvia outro valor, então a
  // edição manual do usuário "não pegava" no quadro.
  it('devolve o horário gravado, mesmo quando ele já passou hoje', async () => {
    mocks.createClient.mockResolvedValue(supabaseCom([
      { id: 'i1', date: HOJE, suggested_time: '09:38', status: 'approved', editorial_plan_item_versions: [] }
    ]));

    const plan = await getWeekPlan('brand-1', HOJE);
    expect(plan.items[0].suggested_time).toBe('09:38');
  });

  it('mantém horário fora dos slots padrão escolhido a mão', async () => {
    mocks.createClient.mockResolvedValue(supabaseCom([
      { id: 'i1', date: '2026-07-24', suggested_time: '07:15', status: 'idea', editorial_plan_item_versions: [] }
    ]));

    const plan = await getWeekPlan('brand-1', HOJE);
    expect(plan.items[0].suggested_time).toBe('07:15');
  });

  // Item antigo sem horário válido ainda ganha uma sugestão — a coluna é TEXT e
  // existe plano gravado antes da coluna existir.
  it('preenche quando o valor gravado não é um horário', async () => {
    mocks.createClient.mockResolvedValue(supabaseCom([
      { id: 'i1', date: '2026-07-22', suggested_time: null, status: 'idea', editorial_plan_item_versions: [] }
    ]));

    const plan = await getWeekPlan('brand-1', HOJE);
    expect(plan.items[0].suggested_time).toBe('18:00');
  });
});
