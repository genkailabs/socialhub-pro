import { describe, it, expect } from 'vitest';
import { computeEngagement, summarizeMedia } from '@/lib/meta/metrics';

describe('summarizeMedia', () => {
  it('soma likes e comentários e conta itens', () => {
    const media = [
      { like_count: 10, comments_count: 2 },
      { like_count: 5, comments_count: 3 }
    ];
    expect(summarizeMedia(media)).toEqual({ totalLikes: 15, totalComments: 5, count: 2 });
  });
  it('lida com lista vazia', () => {
    expect(summarizeMedia([])).toEqual({ totalLikes: 0, totalComments: 0, count: 0 });
  });
});

describe('computeEngagement', () => {
  it('calcula % média por post sobre seguidores', () => {
    expect(computeEngagement({ followers: 200, totalLikes: 15, totalComments: 5, count: 2 })).toBe('5.0%');
  });
  it('retorna 0.0% quando sem seguidores ou sem posts', () => {
    expect(computeEngagement({ followers: 0, totalLikes: 1, totalComments: 1, count: 1 })).toBe('0.0%');
    expect(computeEngagement({ followers: 100, totalLikes: 0, totalComments: 0, count: 0 })).toBe('0.0%');
  });
});
