import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import {
  buildLocalOpportunities,
  buildWeeklyMemory,
  filterCurrentWeekPublishedPosts,
  filterUsablePlanItems,
  getComposerContext,
  getStrategyObjective,
  getRecommendedSlots
} from '@/lib/composer-intelligence';
import { selectDailyOpportunity } from '@/lib/daily-content-package';

function fakeSupabase(fixtures) {
  return {
    from(table) {
      const filters = [];
      const query = {
        select() { return query; },
        eq(column, value) { filters.push(['eq', column, value]); return query; },
        in(column, value) { filters.push(['in', column, value]); return query; },
        gte() { return query; },
        lte() { return query; },
        lt() { return query; },
        order() { return query; },
        limit() { return query; },
        then(resolve, reject) {
          const data = typeof fixtures[table] === 'function'
            ? fixtures[table](filters)
            : fixtures[table] || [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('buildLocalOpportunities', () => {
  it('prioriza temas planejados e mantem a opcao de sugestao local', () => {
    const opportunities = buildLocalOpportunities({
      planItems: [{ status: 'approved', topic: 'Cuidados apos a consulta', format: 'Carrossel', objective: 'educar' }],
      niche: 'medicina'
    });

    expect(opportunities[0]).toMatchObject({
      topic: 'Cuidados apos a consulta',
      format: 'Carrossel',
      goal: 'educar'
    });
    expect(opportunities).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Não sei. Me sugira algo.' })
    ]));
  });

  it('oferece caminhos locais uteis sem plano editorial', () => {
    const opportunities = buildLocalOpportunities({ niche: 'arquitetura' });

    expect(opportunities.length).toBeGreaterThanOrEqual(5);
    expect(opportunities.some((item) => /projeto|processo|inspiracao/i.test(item.label))).toBe(true);
  });

  it('inclui uma oportunidade do diagnostico do Instagram', () => {
    const opportunities = buildLocalOpportunities({
      audit: { ai_analysis: { opportunities: [{ title: 'Aumentar a frequencia de Reels', detail: 'O formato tem espaco para crescer.' }] } }
    });

    expect(opportunities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'audit-0', topic: 'Aumentar a frequencia de Reels' })
    ]));
  });
});

describe('buildWeeklyMemory', () => {
  it('resume formatos publicados sem linguagem tecnica', () => {
    const memory = buildWeeklyMemory([
      { status: 'published', scheduled_at: '2026-07-14T12:00:00.000Z', format: 'CAROUSEL_ALBUM', content: 'Dicas de organizacao' },
      { status: 'posted_manually', scheduled_at: '2026-07-15T12:00:00.000Z', format: 'REELS', content: 'Bastidores do atendimento' }
    ], new Date('2026-07-15T12:00:00.000Z'));

    expect(memory).toContain('2 conteudos');
    expect(memory).toMatch(/carrossel/i);
    expect(memory).not.toMatch(/media_type|created_at|status/i);
  });

  it('explica de forma acolhedora quando nao ha historico recente', () => {
    expect(buildWeeklyMemory([])).toMatch(/primeiro conteudo|semana/i);
  });

  it('considera apenas posts publicados na semana atual', () => {
    const posts = [
      { id: 'published', status: 'published', scheduled_at: '2026-07-14T12:00:00.000Z' },
      { id: 'manual', status: 'posted_manually', scheduled_at: '2026-07-18T12:00:00.000Z' },
      { id: 'draft', status: 'draft', scheduled_at: '2026-07-15T12:00:00.000Z' },
      { id: 'scheduled', status: 'scheduled', scheduled_at: '2026-07-16T12:00:00.000Z' },
      { id: 'old', status: 'published', scheduled_at: '2026-07-12T12:00:00.000Z' }
    ];

    expect(filterCurrentWeekPublishedPosts(posts, new Date('2026-07-18T12:00:00.000Z')).map((post) => post.id)).toEqual(['published', 'manual']);
  });
});

describe('estrategia e plano editorial', () => {
  it('le o objetivo principal do objeto persistido pela estrategia', () => {
    expect(getStrategyObjective({ objectives: { main: 'Atrair novos pacientes', secondary: ['Aumentar autoridade'] } }))
      .toBe('Atrair novos pacientes');
  });

  it('mantem somente itens aprovados da semana atual', () => {
    const items = [
      { id: 'approved', status: 'approved', date: '2026-07-14', topic: 'Tema aprovado' },
      { id: 'idea', status: 'idea', date: '2026-07-18', topic: 'Tema sugerido' },
      { id: 'rejected', status: 'rejected', date: '2026-07-15', topic: 'Tema removido' },
      { id: 'ready', status: 'ready', date: '2026-07-16', topic: 'Tema criado' },
      { id: 'old', status: 'approved', date: '2026-07-12', topic: 'Tema antigo' }
    ];

    expect(filterUsablePlanItems(items, '2026-07-13').map((item) => item.id)).toEqual(['approved']);
  });
});

describe('getRecommendedSlots', () => {
  it('usa os horarios medidos no diagnostico quando existem', () => {
    const result = getRecommendedSlots({
      calculated_metrics: { bestTimes: [{ weekday: 2, hour: 11, basis: 'measured' }] }
    });

    expect(result.hasMetricSignal).toBe(true);
    expect(result.recommendedSlots[0]).toMatchObject({ weekday: 2, time: '11:00' });
  });

  it('usa horarios iniciais quando o diagnostico nao tem sinal confiavel', () => {
    const result = getRecommendedSlots({
      calculated_metrics: { bestTimes: [{ weekday: 1, hour: 9, basis: 'heuristic' }] }
    });

    expect(result.hasMetricSignal).toBe(false);
    expect(result.recommendedSlots.length).toBeGreaterThan(0);
  });
});

describe('getComposerContext daily selection integration', () => {
  it('returns real weekly posts and approved plan items so selection rejects duplicates and prioritizes the calendar', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    mocks.createClient.mockResolvedValue(fakeSupabase({
      posts: [
        { id: 'post-1', status: 'published', scheduled_at: '2026-07-14T10:00:00.000Z', title: 'Tema repetido', format: 'carousel' }
      ],
      content_strategies: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'educar' } }],
      editorial_plans: [{ id: 'plan-1', status: 'approved' }],
      editorial_plan_items: (filters) => {
        const linkedPostIds = filters.find(([kind, column]) => kind === 'in' && column === 'post_id')?.[2];
        if (linkedPostIds) {
          return [{ post_id: 'post-1', objective: 'educar', format: 'carousel', topic: 'Tema repetido' }];
        }
        return [
          { id: 'item-1', status: 'approved', date: '2026-07-15', topic: 'Tema repetido', objective: 'educar', format: 'Carrossel' },
          { id: 'item-2', status: 'approved', date: '2026-07-16', topic: 'Tema seguro do plano', objective: 'converter', format: 'Post' }
        ];
      },
      brand_dna_versions: [{ id: 'dna-1', status: 'approved', content: {} }]
    }));

    const context = await getComposerContext({ brandId: 'brand-1', brand: { niche: 'saude' } });
    const selected = selectDailyOpportunity({ ...context, now: new Date() });

    expect(context.recentPosts).toEqual([
      expect.objectContaining({ id: 'post-1', objective: 'educar', format: 'carousel' })
    ]);
    expect(context.planItems.map((item) => item.id)).toEqual(['item-1', 'item-2']);
    expect(selected).toMatchObject({
      topic: 'Tema seguro do plano',
      objective: 'converter',
      format: 'Post',
      reason: 'approved-calendar',
      avoidReasons: ['topic-published-this-week']
    });
  });

  it('uses linked objectives and real formats to balance contextual opportunities when the calendar is exhausted', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
    mocks.createClient.mockResolvedValue(fakeSupabase({
      posts: [
        { id: 'post-1', status: 'published', scheduled_at: '2026-07-14T10:00:00.000Z', title: 'Outro tema', format: 'carousel' }
      ],
      content_strategies: [{ id: 'strategy-1', status: 'approved', objectives: { main: 'educar' } }],
      editorial_plans: [{ id: 'plan-1', status: 'approved' }],
      editorial_plan_items: (filters) => filters.some(([kind, column]) => kind === 'in' && column === 'post_id')
        ? [{ post_id: 'post-1', objective: 'educar', format: 'carousel', topic: 'Outro tema' }]
        : [],
      brand_dna_versions: [{ id: 'dna-1', status: 'approved', content: {} }]
    }));

    const context = await getComposerContext({ brandId: 'brand-1', brand: { niche: 'saude' } });
    const selected = selectDailyOpportunity({
      ...context,
      contextualOpportunities: [
        { status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Mais educacao', objective: 'educar', format: 'Carrossel' },
        { status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Hora de converter', objective: 'converter', format: 'Post' }
      ],
      now: new Date()
    });

    expect(selected).toMatchObject({ topic: 'Hora de converter', objective: 'converter', format: 'Post' });
  });
});
