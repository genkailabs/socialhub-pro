import { describe, it, expect } from 'vitest';
import { suggestBestTimes, MIN_HISTORY } from '@/lib/youtube/best-times';

describe('suggestBestTimes — sem histórico', () => {
  it('usa heurística quando faltam vídeos', () => {
    const res = suggestBestTimes({ videoStats: [], tzOffsetHours: -3 });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.basis === 'heuristic')).toBe(true);
    expect(res[0]).toHaveProperty('weekday');
    expect(res[0]).toHaveProperty('hour');
  });
  it('ainda é heurística logo abaixo do limite', () => {
    const stats = Array.from({ length: MIN_HISTORY - 1 }, (_, i) => ({
      published_at: '2026-07-07T22:00:00.000Z', views: 10 + i   // ter 19h BR
    }));
    expect(suggestBestTimes({ videoStats: stats, tzOffsetHours: -3 })[0].basis).toBe('heuristic');
  });
});

describe('suggestBestTimes — com histórico', () => {
  it('rankeia a janela real de melhor desempenho', () => {
    // 5 vídeos: quinta 20h BR rende muito mais que segunda 8h BR.
    // 2026-07-09 é quinta; 23:00Z - 3h = 20h BR quinta (weekday 4).
    // 2026-07-06 é segunda; 11:00Z - 3h = 08h BR segunda (weekday 1).
    const stats = [
      { published_at: '2026-07-09T23:00:00.000Z', views: 900 },
      { published_at: '2026-07-16T23:00:00.000Z', views: 850 },
      { published_at: '2026-07-23T23:00:00.000Z', views: 800 },
      { published_at: '2026-07-06T11:00:00.000Z', views: 20 },
      { published_at: '2026-07-13T11:00:00.000Z', views: 15 }
    ];
    const res = suggestBestTimes({ videoStats: stats, tzOffsetHours: -3 });
    expect(res[0].basis).toBe('channel');
    expect(res[0].weekday).toBe(4);   // quinta
    expect(res[0].hour).toBe(20);     // 20h BR
  });
});
