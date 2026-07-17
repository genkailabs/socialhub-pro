import { describe, expect, it, vi } from 'vitest';
import { checkLimit, periodStart } from '@/lib/ai/limits';

// Supabase falso: ai_limits devolve `limits`, generation_jobs devolve `count`.
function makeSupabase({ limits = [], count = 0 } = {}) {
  const jobsQuery = {
    select: vi.fn(() => jobsQuery),
    eq: vi.fn(() => jobsQuery),
    gte: vi.fn(() => jobsQuery),
    then: (resolve) => resolve({ count, error: null })
  };
  const limitsQuery = {
    select: vi.fn(() => limitsQuery),
    eq: vi.fn(() => limitsQuery),
    in: vi.fn(() => limitsQuery),
    then: (resolve) => resolve({ data: limits, error: null })
  };
  return {
    from: vi.fn((table) => {
      if (table === 'ai_limits') return limitsQuery;
      if (table === 'generation_jobs') return jobsQuery;
      throw new Error(`Tabela inesperada: ${table}`);
    }),
    jobsQuery
  };
}

const ctx = (supabase) => ({ supabase, brandId: 'brand-1', userId: 'user-1', skillId: 'diagnostico' });

describe('periodStart', () => {
  it('mes comeca no dia 1', () => {
    expect(periodStart('month', new Date('2026-07-16T22:00:00Z'))).toBe('2026-07-01T00:00:00.000Z');
  });

  it('dia comeca a meia-noite', () => {
    expect(periodStart('day', new Date('2026-07-16T22:00:00Z'))).toBe('2026-07-16T00:00:00.000Z');
  });
});

describe('checkLimit', () => {
  it('libera quando a skill nao tem limite configurado', async () => {
    const supabase = makeSupabase({ limits: [] });

    await expect(checkLimit(ctx(supabase))).resolves.toEqual({ allowed: true });
  });

  it('libera enquanto houver saldo', async () => {
    const supabase = makeSupabase({ limits: [{ brand_id: null, skill_id: 'diagnostico', period: 'month', max_runs: 1 }], count: 0 });

    await expect(checkLimit(ctx(supabase))).resolves.toEqual({ allowed: true });
  });

  it('bloqueia quando o limite foi atingido, dizendo o numero', async () => {
    const supabase = makeSupabase({ limits: [{ brand_id: null, skill_id: 'diagnostico', period: 'month', max_runs: 1 }], count: 1 });

    const res = await checkLimit(ctx(supabase));

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('1');
    expect(res.reason).toContain('mes');
  });

  // O limite da marca vence o padrão global — é o que permite plano diferenciado.
  it('prefere o limite da marca ao padrao global', async () => {
    const supabase = makeSupabase({
      limits: [
        { brand_id: null, skill_id: 'diagnostico', period: 'month', max_runs: 1 },
        { brand_id: 'brand-1', skill_id: 'diagnostico', period: 'month', max_runs: 5 }
      ],
      count: 3
    });

    await expect(checkLimit(ctx(supabase))).resolves.toEqual({ allowed: true });
  });

  it('conta apenas as execucoes bem-sucedidas da mesma skill e marca', async () => {
    const supabase = makeSupabase({ limits: [{ brand_id: null, skill_id: 'diagnostico', period: 'month', max_runs: 1 }], count: 0 });

    await checkLimit(ctx(supabase));

    expect(supabase.jobsQuery.eq).toHaveBeenCalledWith('brand_id', 'brand-1');
    expect(supabase.jobsQuery.eq).toHaveBeenCalledWith('skill_id', 'diagnostico');
    expect(supabase.jobsQuery.eq).toHaveBeenCalledWith('status', 'success');
    expect(supabase.jobsQuery.gte).toHaveBeenCalledWith('created_at', expect.stringContaining('-01T00:00:00.000Z'));
  });

  // Se a checagem quebrar, é melhor deixar passar do que travar o produto:
  // o custo continua registrado e visível em /ai-costs.
  it('libera quando a propria checagem falha', async () => {
    const supabase = { from: vi.fn(() => { throw new Error('sem tabela ai_limits'); }) };

    await expect(checkLimit(ctx(supabase))).resolves.toEqual({ allowed: true });
  });
});
