import { describe, expect, it } from 'vitest';
import { feedbackForLearning, learningComparison, validatePublication } from '@/lib/publication-learning';

describe('publicação e aprendizado', () => {
  it('bloqueia publicação sem conexão, mídia e aprovação pendente', () => {
    const result = validatePublication({ connected: false, mediaUrls: [], approvalStatus: 'waiting_approval' });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
  it('exige pelo menos duas mídias para carrossel', () => {
    expect(validatePublication({ connected: true, mediaUrls: ['a'], format: 'carousel' }).errors[0]).toMatch(/carrossel/i);
  });
  it('compara com a base anterior e explica em linguagem simples', () => {
    expect(learningComparison({ baseline: 100, observed: 123 })).toBe(23);
    expect(feedbackForLearning({ topic: 'implantes', format: 'carrossel', metric: 'salvamentos', comparison: 23 })).toMatch(/23% a mais de salvamentos/i);
  });
});
