import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ generateCreative: vi.fn() }));
vi.mock('@/lib/ai/generate', () => ({ generateCreative: mocks.generateCreative }));
vi.mock('@/lib/posts-media', () => ({ composeCaption: (c) => c }));

import { runDailyAutopilot } from '@/lib/autopilot';
import { ResearchUnavailableError } from '@/lib/ai/research';

// Fake admin Supabase: registra inserts por tabela e devolve dados fixos.
function fakeAdmin({ plans, brand, kit }) {
  const inserts = { posts: [], generation_jobs: [] };
  const updates = { content_plans: [] };
  return {
    inserts, updates,
    from(table) {
      const api = {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => ({ data: table === 'brands' ? brand : table === 'brand_kits' ? kit : null }),
        insert(payload) {
          const rows = Array.isArray(payload) ? payload : [payload];
          inserts[table] = (inserts[table] || []).concat(rows);
          return { select: () => ({ single: async () => ({ data: { id: 'post-1' } }) }) };
        },
        update(payload) { updates[table] = (updates[table] || []).concat(payload); return { eq: async () => ({}) }; }
      };
      if (table === 'content_plans') api.eq = () => ({ then: undefined, ...api, async _run() {} });
      // content_plans.select('*').eq('active',true) devolve os planos
      if (table === 'content_plans') {
        api.select = () => ({ eq: async () => ({ data: plans }) });
        api.update = (payload) => { updates.content_plans.push(payload); return { eq: async () => ({}) }; };
      }
      return api;
    }
  };
}

const PLAN = { brand_id: 'b1', active: true, posts_per_day: 1, format: 'news', pillars: ['IA'], last_run_at: null };
const GEN_OK = {
  spec: { headline: 'Oi', caption: 'legenda', hashtags: ['#a'] },
  imageUrls: ['https://img/1.png'], cost: 0.01, textCost: 0.001,
  usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'deepseek-v4-flash',
  imageProvider: 'none',
  research: { model: 'gemini-2.5-flash', usage: { prompt_tokens: 20, completion_tokens: 8 }, cost: 0.01, cached: false }
};

describe('runDailyAutopilot + pesquisa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sucesso com pesquisa: insere post e job de research', async () => {
    mocks.generateCreative.mockResolvedValue(GEN_OK);
    const admin = fakeAdmin({ plans: [PLAN], brand: { id: 'b1', name: 'Marca', color: '#000' }, kit: { pillars: ['IA'] } });

    await runDailyAutopilot(admin);

    expect(admin.inserts.posts).toHaveLength(1);
    expect(admin.inserts.generation_jobs.some((r) => r.kind === 'research' && r.status === 'success')).toBe(true);
    expect(admin.updates.content_plans).toHaveLength(1); // last_run_at atualizado
  });

  it('pesquisa indisponível: NÃO insere post, registra job research error', async () => {
    mocks.generateCreative.mockRejectedValue(new ResearchUnavailableError());
    const admin = fakeAdmin({ plans: [PLAN], brand: { id: 'b1', name: 'Marca', color: '#000' }, kit: {} });

    const results = await runDailyAutopilot(admin);

    expect(admin.inserts.posts).toHaveLength(0);
    const researchErr = admin.inserts.generation_jobs.find((r) => r.kind === 'research');
    expect(researchErr).toMatchObject({ status: 'error' });
    expect(results.some((r) => r.skipped)).toBe(true);
  });
});
