import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  runSkill: vi.fn(),
  revalidatePath: vi.fn(),
  summarizeDnaSignals: vi.fn(),
  resolvePalette: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/ai/skills/run', () => ({ runSkill: mocks.runSkill }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/dna-signals', () => ({ summarizeDnaSignals: mocks.summarizeDnaSignals }));
vi.mock('@/lib/ai/templates', () => ({ resolvePalette: mocks.resolvePalette }));

import { generateWeekPlan, setPlanItemStatus, updatePlanItem } from '@/lib/planning-actions';
import { produceFromPlanItem } from '@/lib/content-actions';

function workflowSupabase() {
  const database = { plan: null, items: [], posts: [] };
  const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) };
  const matchingItems = (filters) => database.items.filter((item) => filters.every(([field, value]) => item[field] === value));

  function itemUpdate(payload) {
    const filters = [];
    let committed = false;
    const commit = () => {
      if (committed) return matchingItems(filters);
      committed = true;
      const matches = matchingItems(filters);
      matches.forEach((item) => Object.assign(item, payload));
      return matches;
    };
    const query = {
      eq(field, value) { filters.push([field, value]); return query; },
      select() {
        return {
          maybeSingle: async () => {
            const updated = commit()[0];
            return { data: updated ? { id: updated.id } : null, error: null };
          }
        };
      },
      then(resolve, reject) { return Promise.resolve({ error: null }).then(() => { commit(); return { error: null }; }).then(resolve, reject); }
    };
    return query;
  }

  const supabase = {
    auth,
    from(table) {
      if (table === 'brands') return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'brand-1', name: 'Marca', color: '#123456' }, error: null }) }) })
      };
      if (table === 'content_strategies') return {
        select: () => ({ eq: async () => ({ data: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'Ensinar' }, pillars: [{ name: 'Educação', share: 100 }], formats: ['reel'], frequency: { postsPerWeek: 1 } }], error: null }) })
      };
      if (table === 'brand_kits') return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
      };
      if (table === 'editorial_plans') return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: database.plan, error: null }) }) }) }),
        upsert: (payload) => ({ select: () => ({ maybeSingle: async () => {
          database.plan = { id: 'plan-1', ...payload };
          return { data: database.plan, error: null };
        } }) })
      };
      if (table === 'editorial_plan_items') return {
        select: () => {
          const filters = [];
          const query = {
            eq(field, value) { filters.push([field, value]); return query; },
            maybeSingle: async () => {
              const item = matchingItems(filters)[0];
              return { data: item ? { ...item, editorial_plans: { brand_id: 'brand-1' } } : null, error: null };
            }
          };
          return query;
        },
        insert: async (items) => {
          database.items.push(...items.map((item, index) => ({ id: `item-${database.items.length + index + 1}`, ...item })));
          return { error: null };
        },
        update: itemUpdate
      };
      if (table === 'posts') return {
        select: () => {
          const query = {
            eq() { return query; },
            order() { return query; },
            limit: async () => ({ data: [], error: null })
          };
          return query;
        },
        insert: (payload) => ({ select: () => ({ maybeSingle: async () => {
          const post = { id: `post-${database.posts.length + 1}`, ...payload };
          database.posts.push(post);
          return { data: post, error: null };
        } }) })
      };
      throw new Error(`Tabela inesperada: ${table}`);
    }
  };

  return { database, supabase };
}

describe('fluxo semanal completo', () => {
  // A janela de planejamento comeca HOJE (§1), entao o teste precisa fixar o
  // relogio: com data fixa e relogio real, o fixture viraria passado sozinho no
  // dia seguinte e o teste quebraria sem ninguem mexer no codigo.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T12:00:00.000Z')); // 09:00 em Sao Paulo
    vi.clearAllMocks();
    mocks.summarizeDnaSignals.mockResolvedValue(null);
    mocks.resolvePalette.mockReturnValue({ accent: '#123456' });
    mocks.runSkill.mockImplementation(async ({ skill }) => {
      if (skill.id === 'editorial-planner') return {
        data: {
          weeklySummary: { mainFocus: 'Ensinar', description: 'Uma semana educativa.' },
          items: [{ date: '2026-07-20', format: 'reel', topic: 'Tema inicial', title: 'Ideia inicial', objective: 'Ensinar', pillar: 'Educação', stage: 'descoberta', summary: 'Resumo', hook: 'Gancho', cta: 'Comente', targetAudience: 'Donos de negócio', estimatedDuration: '30 segundos', rationale: 'Motivo' }]
        },
        cost: 0.01
      };
      if (skill.id === 'content-review') return { data: { decision: 'aprovado' }, cost: 0.01 };
      return { data: { script: 'Roteiro', caption: 'Legenda' }, cost: 0.01 };
    });
  });

  afterEach(() => vi.useRealTimers());

  it('gera uma ideia, permite editar, aprova e só então produz até ficar pronta', async () => {
    const { database, supabase } = workflowSupabase();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(generateWeekPlan({ brandId: 'brand-1', weekStart: '2026-07-20' })).resolves.toMatchObject({ ok: true, count: 1 });
    expect(database.items[0]).toMatchObject({ status: 'idea', title: 'Ideia inicial' });

    await expect(updatePlanItem({ itemId: 'item-1', patch: { title: 'Ideia editada' } })).resolves.toEqual({ ok: true });
    expect(database.items[0].title).toBe('Ideia editada');

    await expect(setPlanItemStatus({ itemId: 'item-1', status: 'approved' })).resolves.toEqual({ ok: true });
    expect(database.items[0].status).toBe('approved');

    await expect(produceFromPlanItem({ itemId: 'item-1' })).resolves.toMatchObject({ ok: true, postId: 'post-1' });
    expect(database.items[0]).toMatchObject({ status: 'ready', post_id: 'post-1', production_error: null });
    expect(database.posts).toHaveLength(1);
  });
});
