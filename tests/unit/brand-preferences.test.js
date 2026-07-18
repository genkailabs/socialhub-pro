import { describe, expect, it } from 'vitest';
import { recordBrandPreference, listBrandPreferences } from '@/lib/brand-preferences-data';

// Fake mínimo do client Supabase. `rows` simula o estado da tabela.
function fakeSupabase({ rows = [] } = {}) {
  const state = [...rows];
  const rpcCalls = [];
  return {
    state, rpcCalls,
    from() {
      return {
        select() { return this; },
        eq(col, val) { this._eq = { ...(this._eq || {}), [col]: val }; return this; },
        order() { return this; },
        limit(n) {
          const filtered = state.filter((r) => Object.entries(this._eq || {}).every(([k, v]) => r[k] === v));
          filtered.sort((a, b) => (b.usage_count - a.usage_count) || (new Date(b.last_used) - new Date(a.last_used)));
          return Promise.resolve({ data: filtered.slice(0, n), error: null });
        }
      };
    },
    rpc: async (fn, args) => {
      rpcCalls.push({ fn, args });
      const idx = state.findIndex((r) => r.brand_id === args.p_brand_id && r.preference_type === args.p_type && r.value === args.p_value);
      if (idx >= 0) state[idx] = { ...state[idx], usage_count: (state[idx].usage_count || 0) + 1, last_used: new Date().toISOString() };
      else state.push({ brand_id: args.p_brand_id, preference_type: args.p_type, value: args.p_value, usage_count: 1, last_used: new Date().toISOString() });
      return { error: null };
    }
  };
}

describe('recordBrandPreference', () => {
  it('grava valor novo com usage_count 1', async () => {
    const supabase = fakeSupabase({});
    await recordBrandPreference({ supabase, brandId: 'b1', type: 'format', value: 'Tutorial passo a passo' });
    expect(supabase.state).toHaveLength(1);
    expect(supabase.state[0]).toMatchObject({ brand_id: 'b1', preference_type: 'format', value: 'Tutorial passo a passo' });
  });
  it('incrementa usage_count em valor repetido', async () => {
    const supabase = fakeSupabase({ rows: [{ brand_id: 'b1', preference_type: 'format', value: 'Tutorial', usage_count: 2, last_used: '2026-01-01' }] });
    await recordBrandPreference({ supabase, brandId: 'b1', type: 'format', value: 'Tutorial' });
    expect(supabase.state[0].usage_count).toBe(3);
  });
  it('valor vazio não grava nada', async () => {
    const supabase = fakeSupabase({});
    await recordBrandPreference({ supabase, brandId: 'b1', type: 'format', value: '  ' });
    expect(supabase.rpcCalls).toHaveLength(0);
  });
  it('erro no supabase não lança (best-effort)', async () => {
    const supabase = { rpc: async () => { throw new Error('down'); } };
    await expect(recordBrandPreference({ supabase, brandId: 'b1', type: 'format', value: 'x' })).resolves.toBeUndefined();
  });
});

describe('listBrandPreferences', () => {
  it('devolve os mais usados primeiro, filtrados por tipo', async () => {
    const supabase = fakeSupabase({
      rows: [
        { brand_id: 'b1', preference_type: 'format', value: 'A', usage_count: 1, last_used: '2026-01-01' },
        { brand_id: 'b1', preference_type: 'format', value: 'B', usage_count: 5, last_used: '2026-01-02' },
        { brand_id: 'b1', preference_type: 'tone', value: 'C', usage_count: 9, last_used: '2026-01-03' }
      ]
    });
    const out = await listBrandPreferences({ supabase, brandId: 'b1', type: 'format' });
    expect(out.map((r) => r.value)).toEqual(['B', 'A']);
  });
  it('erro no supabase devolve lista vazia (best-effort)', async () => {
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => { throw new Error('down'); } }) }) }) }) }) };
    await expect(listBrandPreferences({ supabase, brandId: 'b1', type: 'format' })).resolves.toEqual([]);
  });
});
