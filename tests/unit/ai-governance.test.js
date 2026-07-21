import { describe, expect, it, vi } from 'vitest';
import { beginProductionPackage, LIMIT_REACHED_MESSAGE, monthStart } from '@/lib/ai/governance';

function response(value) {
  const query = {};
  for (const method of ['select', 'eq', 'gte', 'in', 'limit']) query[method] = vi.fn(() => query);
  query.then = (resolve) => resolve(value);
  return query;
}

function fakeSupabase({ plan = { plan_key: 'essencial', productions_per_month: 8, images_per_content: 2, research_policy: 'limited' }, completed = 0, assignedPlan = null } = {}) {
  const insert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'package-1', image_limit: plan.images_per_content, research_allowed: true }, error: null })) })) }));
  return {
    from: vi.fn((table) => {
      if (table === 'brand_ai_plans') return response({ data: assignedPlan ? [{ plan_key: assignedPlan }] : [] });
      if (table === 'ai_plan_limits') return response({ data: [plan], error: null });
      if (table === 'ai_production_packages') {
        const query = response({ count: completed, error: null });
        query.insert = insert;
        return query;
      }
      throw new Error(`Tabela inesperada: ${table}`);
    }),
    insert
  };
}

describe('governanca de pacotes de producao', () => {
  it('inicia um pacote com o teto de imagens configurado no plano', async () => {
    const supabase = fakeSupabase();
    const result = await beginProductionPackage({ supabase, brandId: 'brand-1', userId: 'user-1', recommendationId: 'rec-1' });

    expect(result.allowed).toBe(true);
    expect(result.productionPackage.image_limit).toBe(2);
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 'brand-1', user_id: 'user-1', recommendation_id: 'rec-1', plan_key: 'essencial', image_limit: 2
    }));
  });

  it('bloqueia uma nova producao quando as concluidas chegam ao limite', async () => {
    const supabase = fakeSupabase({ plan: { plan_key: 'profissional', productions_per_month: 20, images_per_content: 4, research_policy: 'included' }, assignedPlan: 'profissional', completed: 20 });
    const result = await beginProductionPackage({ supabase, brandId: 'brand-1', userId: 'user-1' });

    expect(result).toMatchObject({ allowed: false, message: LIMIT_REACHED_MESSAGE });
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it('calcula o inicio do ciclo no primeiro dia do mes', () => {
    expect(monthStart(new Date('2026-07-18T15:00:00Z'))).toBe('2026-07-01T00:00:00.000Z');
  });
});
