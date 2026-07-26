import { describe, expect, it } from 'vitest';
import { buildDailyPackageDraft, selectDailyOpportunity } from '@/lib/daily-content-package';
import { buildLocalOpportunities } from '@/lib/composer-intelligence';

describe('daily content package', () => {
  it('prioritizes an approved calendar item over contextual opportunities', () => {
    const result = selectDailyOpportunity({
      now: new Date('2026-07-15T12:00:00.000Z'),
      planItems: [
        { id: 'rejected', status: 'rejected', date: '2026-07-15', topic: 'Ignore this', objective: 'engajar', format: 'Reel' },
        { id: 'approved', status: 'approved', date: '2026-07-15', topic: 'Tema do calendario', objective: 'educar', format: 'Carrossel' }
      ],
      contextualOpportunities: [{ topic: 'Tema contextual', objective: 'converter', format: 'Post' }],
      audit: { calculated_metrics: { bestTimes: [{ weekday: 3, hour: 11, basis: 'measured' }] } }
    });

    expect(result).toMatchObject({
      topic: 'Tema do calendario',
      objective: 'educar',
      format: 'Carrossel',
      reason: 'approved-calendar',
      sourceRequirement: 'approved-calendar',
      recommendedAt: { weekday: 3, time: '11:00', source: 'measured' },
      avoidReasons: []
    });
  });

  it('rejects a topic that was published during the current week', () => {
    const result = buildDailyPackageDraft({
      now: new Date('2026-07-15T12:00:00.000Z'),
      planItems: [
        { status: 'approved', date: '2026-07-15', topic: 'Tema ja publicado', objective: 'educar', format: 'Carrossel' },
        { status: 'approved', date: '2026-07-16', topic: 'Tema seguro', objective: 'engajar', format: 'Reel' }
      ],
      posts: [{ status: 'published', scheduled_at: '2026-07-14T10:00:00.000Z', title: 'Tema ja publicado' }]
    });

    expect(result).toMatchObject({ topic: 'Tema seguro', reason: 'approved-calendar' });
    expect(result.avoidReasons).toContain('topic-published-this-week');
  });

  it('breaks contextual ties with the least-represented objective and format', () => {
    const result = selectDailyOpportunity({
      now: new Date('2026-07-15T12:00:00.000Z'),
      posts: [
        { status: 'published', scheduled_at: '2026-07-14T10:00:00.000Z', objective: 'educar', format: 'Carrossel' },
        { status: 'posted_manually', scheduled_at: '2026-07-15T10:00:00.000Z', objective: 'educar', format: 'Carrossel' }
      ],
      contextualOpportunities: [
        { status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Tema repetido', objective: 'educar', format: 'Carrossel' },
        { status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Tema equilibrado', objective: 'engajar', format: 'Reel' }
      ]
    });

    expect(result).toMatchObject({
      topic: 'Tema equilibrado',
      objective: 'engajar',
      format: 'Reel',
      reason: 'contextual-opportunity'
    });
  });

  it('excludes proposed and rejected contextual opportunities without approved provenance', () => {
    const result = selectDailyOpportunity({
      contextualOpportunities: [
        { status: 'proposed', provenance: { status: 'approved' }, topic: 'Tema proposto', objective: 'educar', format: 'Carrossel' },
        { status: 'rejected', provenance: { status: 'approved' }, topic: 'Tema rejeitado', objective: 'engajar', format: 'Reel' },
        { status: 'invalid', provenance: { status: 'approved' }, topic: 'Tema invalido', objective: 'converter', format: 'Post' },
        { status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Tema aprovado', objective: 'converter', format: 'Post' }
      ]
    });

    expect(result).toMatchObject({ topic: 'Tema aprovado', reason: 'contextual-opportunity' });
  });

  it('accepts the trusted Composer opportunity shape, including goal as its objective', () => {
    const [opportunity] = buildLocalOpportunities({
      niche: 'medicina',
      strategy: { status: 'approved', objectives: 'Aumentar autoridade' }
    });

    const result = selectDailyOpportunity({ opportunities: [opportunity] });

    expect(result).toMatchObject({
      topic: opportunity.topic,
      objective: opportunity.goal,
      format: opportunity.format,
      reason: 'contextual-opportunity'
    });
  });

  it('excludes an audit-only opportunity even when it is marked approved', () => {
    const [auditOpportunity] = buildLocalOpportunities({
      audit: { ai_analysis: { opportunities: [{ title: 'Aumentar a frequencia de Reels', status: 'approved' }] } }
    });

    expect(selectDailyOpportunity({ opportunities: [auditOpportunity] })).toBeNull();
  });

  it('uses a measured slot when valid and marks the fallback explicitly otherwise', () => {
    const measured = selectDailyOpportunity({
      contextualOpportunities: [{ status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Tema medido', objective: 'educar', format: 'Carrossel' }],
      audit: { calculated_metrics: { bestTimes: [{ weekday: 2, hour: 9, basis: 'measured' }] } }
    });
    const fallback = selectDailyOpportunity({
      contextualOpportunities: [{ status: 'approved', provenance: { source: 'content-strategy' }, topic: 'Tema fallback', objective: 'educar', format: 'Carrossel' }],
      audit: { calculated_metrics: { bestTimes: [{ weekday: 2, hour: 9, basis: 'heuristic' }] } }
    });

    expect(measured.recommendedAt).toEqual({ weekday: 2, time: '09:00', source: 'measured' });
    expect(fallback.recommendedAt).toMatchObject({ source: 'fallback' });
  });
});
