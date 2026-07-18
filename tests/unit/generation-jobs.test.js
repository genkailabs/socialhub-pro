import { describe, expect, it } from 'vitest';
import { buildGenerationJobs } from '@/lib/ai/jobs';

const baseGen = {
  model: 'deepseek-v4-flash',
  usage: { prompt_tokens: 10, completion_tokens: 5 },
  textCost: 0.001,
  imageProvider: 'none',
  research: null
};

describe('buildGenerationJobs', () => {
  it('gera só a linha de texto quando não há pesquisa nem imagem', () => {
    const rows = buildGenerationJobs({ brandId: 'b1', gen: baseGen, textKind: 'post' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ brand_id: 'b1', kind: 'post', provider: 'deepseek', cost_usd: 0.001, status: 'success' });
  });

  it('inclui linha de pesquisa (success) com custo do Gemini', () => {
    const gen = { ...baseGen, research: { model: 'tavily-search', usage: { prompt_tokens: 20, completion_tokens: 8 }, cost: 0.01, cached: false } };
    const rows = buildGenerationJobs({ brandId: 'b1', gen, textKind: 'post', refPostId: 'p9' });
    const research = rows.find((r) => r.kind === 'research');
    expect(research).toMatchObject({ provider: 'tavily', cost_usd: 0.01, status: 'success', ref_post_id: 'p9' });
    expect(research.input_tokens).toBe(20);
  });

  it('marca pesquisa cacheada como cached e custo zero', () => {
    const gen = { ...baseGen, research: { model: 'tavily-search', usage: {}, cost: 0, cached: true } };
    const rows = buildGenerationJobs({ brandId: 'b1', gen, textKind: 'autopilot' });
    expect(rows.find((r) => r.kind === 'research')).toMatchObject({ status: 'cached', cost_usd: 0 });
  });

  it('inclui linha de imagem quando o provedor é pollinations', () => {
    const gen = { ...baseGen, imageProvider: 'pollinations', imageModel: 'flux', imageCost: 0.003 };
    const rows = buildGenerationJobs({ brandId: 'b1', gen, textKind: 'autopilot', refPostId: 'p1' });
    expect(rows.find((r) => r.kind === 'image')).toMatchObject({ provider: 'pollinations', model: 'flux', cost_usd: 0.003, ref_post_id: 'p1' });
  });

  it('respeita o textKind (post vs autopilot)', () => {
    expect(buildGenerationJobs({ brandId: 'b1', gen: baseGen, textKind: 'autopilot' })[0].kind).toBe('autopilot');
  });
});
