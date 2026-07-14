import { describe, it, expect } from 'vitest';
import { parseReportRow, parseChannelReport, parseVideoRows } from '@/lib/youtube/analytics';

describe('parseReportRow', () => {
  it('mapeia columnHeaders para objeto por nome', () => {
    const json = {
      columnHeaders: [{ name: 'views' }, { name: 'likes' }],
      rows: [[100, 7]]
    };
    expect(parseReportRow(json)).toEqual({ views: 100, likes: 7 });
  });
  it('retorna objeto vazio quando não há linhas', () => {
    expect(parseReportRow({ columnHeaders: [{ name: 'views' }], rows: [] })).toEqual({});
    expect(parseReportRow({})).toEqual({});
  });
});

describe('parseChannelReport', () => {
  it('normaliza métricas de canal', () => {
    const json = {
      columnHeaders: [{ name: 'views' }, { name: 'estimatedMinutesWatched' }, { name: 'subscribersGained' }],
      rows: [[500, 1200, 15]]
    };
    expect(parseChannelReport(json)).toEqual({ views: 500, watchTimeMin: 1200, subscribersGained: 15 });
  });
  it('usa zero para métricas ausentes', () => {
    expect(parseChannelReport({ columnHeaders: [], rows: [] }))
      .toEqual({ views: 0, watchTimeMin: 0, subscribersGained: 0 });
  });
});

describe('parseVideoRows', () => {
  it('normaliza uma linha por vídeo (dimensions=video)', () => {
    const json = {
      columnHeaders: [
        { name: 'video' }, { name: 'views' }, { name: 'likes' }, { name: 'comments' },
        { name: 'averageViewPercentage' }, { name: 'estimatedMinutesWatched' }
      ],
      rows: [
        ['vidA', 300, 20, 4, 42.5, 90],
        ['vidB', 10, 1, 0, 5, 3]
      ]
    };
    expect(parseVideoRows(json)).toEqual([
      { videoId: 'vidA', views: 300, likes: 20, comments: 4, avgViewPct: 42.5, watchTimeMin: 90 },
      { videoId: 'vidB', views: 10, likes: 1, comments: 0, avgViewPct: 5, watchTimeMin: 3 }
    ]);
  });
  it('retorna lista vazia sem dimensão de vídeo ou sem linhas', () => {
    expect(parseVideoRows({ columnHeaders: [{ name: 'views' }], rows: [[1]] })).toEqual([]);
    expect(parseVideoRows({})).toEqual([]);
  });
});
