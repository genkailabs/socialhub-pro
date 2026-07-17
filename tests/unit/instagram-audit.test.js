import { describe, expect, it } from 'vitest';
import {
  postingFrequency,
  formatBreakdown,
  rankPosts,
  followerGrowth,
  buildAuditSummary
} from '@/lib/meta/audit';

const NOW = new Date('2026-07-16T12:00:00.000Z');
const dias = (n) => new Date(NOW.getTime() - n * 24 * 3600 * 1000).toISOString();

const post = (over = {}) => ({
  id: 'p1',
  timestamp: dias(1),
  media_type: 'IMAGE',
  like_count: 10,
  comments_count: 2,
  caption: 'oi',
  permalink: 'https://x',
  ...over
});

describe('postingFrequency', () => {
  // O periodo vai do post mais antigo ate agora: 22 dias, nao 28.
  it('devolve posts por semana no periodo', () => {
    const media = [post({ timestamp: dias(1) }), post({ timestamp: dias(8) }), post({ timestamp: dias(15) }), post({ timestamp: dias(22) })];

    expect(postingFrequency(media, NOW)).toEqual({ perWeek: 1.3, total: 4, days: 22 });
  });

  it('conta uma vez por semana quando o intervalo e semanal exato', () => {
    const media = [post({ timestamp: dias(7) }), post({ timestamp: dias(14) }), post({ timestamp: dias(21) })];

    expect(postingFrequency(media, NOW)).toMatchObject({ perWeek: 1, days: 21 });
  });

  it('nao inventa frequencia sem posts', () => {
    expect(postingFrequency([], NOW)).toEqual({ perWeek: 0, total: 0, days: 0 });
  });

  it('ignora post sem data', () => {
    expect(postingFrequency([post({ timestamp: null })], NOW).total).toBe(0);
  });
});

describe('formatBreakdown', () => {
  it('conta os formatos usados, do mais comum ao menos', () => {
    const media = [post({ media_type: 'IMAGE' }), post({ media_type: 'CAROUSEL_ALBUM' }), post({ media_type: 'IMAGE' })];

    expect(formatBreakdown(media)).toEqual([
      { format: 'IMAGE', count: 2, share: 67 },
      { format: 'CAROUSEL_ALBUM', count: 1, share: 33 }
    ]);
  });

  it('devolve lista vazia sem posts', () => {
    expect(formatBreakdown([])).toEqual([]);
  });
});

describe('rankPosts', () => {
  it('separa os que ficaram acima e abaixo da media', () => {
    const media = [
      post({ id: 'alto', like_count: 100, comments_count: 0 }),
      post({ id: 'medio', like_count: 10, comments_count: 0 }),
      post({ id: 'baixo', like_count: 1, comments_count: 0 })
    ];

    const res = rankPosts(media);

    expect(res.average).toBeCloseTo(37, 0);
    expect(res.top[0].id).toBe('alto');
    expect(res.below.map((p) => p.id)).toEqual(expect.arrayContaining(['medio', 'baixo']));
  });

  it('soma curtidas e comentarios como interacao', () => {
    const res = rankPosts([post({ id: 'a', like_count: 5, comments_count: 5 })]);

    expect(res.top[0].interactions).toBe(10);
  });

  it('aguenta perfil sem posts', () => {
    expect(rankPosts([])).toEqual({ average: 0, top: [], below: [] });
  });
});

describe('followerGrowth', () => {
  it('calcula a variacao no periodo', () => {
    const history = [{ followers: 100 }, { followers: 110 }];

    expect(followerGrowth(history)).toEqual({ start: 100, end: 110, delta: 10, pct: 10 });
  });

  it('aceita queda', () => {
    expect(followerGrowth([{ followers: 200 }, { followers: 180 }])).toMatchObject({ delta: -20, pct: -10 });
  });

  // Um unico ponto nao e evolucao: nao inventar tendencia.
  it('devolve nulo com menos de dois pontos', () => {
    expect(followerGrowth([{ followers: 100 }])).toBeNull();
    expect(followerGrowth([])).toBeNull();
  });

  it('nao divide por zero quando comeca do zero', () => {
    expect(followerGrowth([{ followers: 0 }, { followers: 10 }])).toMatchObject({ delta: 10, pct: null });
  });
});

describe('buildAuditSummary', () => {
  const media = Array.from({ length: 6 }, (_, i) => post({ id: `p${i}`, timestamp: dias(i + 1), like_count: 10 * i }));

  it('monta o resumo estruturado para a skill', () => {
    const res = buildAuditSummary({
      profile: { username: 'ana', followers: 1000, mediaCount: 6, biography: 'Psicologa' },
      media,
      followerHistory: [{ followers: 900 }, { followers: 1000 }],
      now: NOW
    });

    expect(res.profile).toMatchObject({ username: 'ana', followers: 1000 });
    expect(res.frequency.total).toBe(6);
    expect(res.formats[0].format).toBe('IMAGE');
    expect(res.growth).toMatchObject({ delta: 100 });
    expect(res.bestTimes.length).toBeGreaterThan(0);
  });

  // O PRD proibe a IA inventar metrica indisponivel: o resumo precisa dizer
  // explicitamente o que a Meta nao entregou.
  it('marca como indisponivel o que a Meta nao forneceu', () => {
    const res = buildAuditSummary({ profile: { username: 'ana', followers: 1000 }, media, now: NOW });

    expect(res.unavailable).toContain('alcance');
    expect(res.unavailable).toContain('impressoes');
    expect(res.unavailable).toContain('salvamentos');
  });

  it('nao marca como indisponivel o que foi fornecido', () => {
    const res = buildAuditSummary({
      profile: { username: 'ana', followers: 1000 },
      media,
      insights: { reach: 500, impressions: 800, saves: 10, shares: 4, profileViews: 20 },
      now: NOW
    });

    expect(res.unavailable).toEqual([]);
    expect(res.insights).toMatchObject({ reach: 500, saves: 10 });
  });

  it('avisa quando ha poucos dados para concluir (RF-03)', () => {
    const res = buildAuditSummary({ profile: { username: 'ana', followers: 10 }, media: [post()], now: NOW });

    expect(res.lowData).toBe(true);
  });

  it('nao avisa poucos dados com historico suficiente', () => {
    const res = buildAuditSummary({ profile: { username: 'ana', followers: 1000 }, media, now: NOW });

    expect(res.lowData).toBe(false);
  });
});
