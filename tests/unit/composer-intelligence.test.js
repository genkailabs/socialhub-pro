import { describe, expect, it } from 'vitest';
import {
  buildLocalOpportunities,
  buildWeeklyMemory,
  filterCurrentWeekPublishedPosts,
  filterUsablePlanItems,
  getStrategyObjective,
  getRecommendedSlots
} from '@/lib/composer-intelligence';

describe('buildLocalOpportunities', () => {
  it('prioriza temas planejados e mantem a opcao de sugestao local', () => {
    const opportunities = buildLocalOpportunities({
      planItems: [{ topic: 'Cuidados apos a consulta', format: 'Carrossel', objective: 'educar' }],
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
