import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from '@/lib/ai/cost';

const usage = { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 };

describe('estimateCostUsd', () => {
  it('cobra o preço do modelo do DeepSeek que rodou', () => {
    expect(estimateCostUsd('deepseek-v4-flash', usage)).toBe(0.42);
    expect(estimateCostUsd('deepseek-v4-pro', usage)).toBe(1.305);
  });

  // Sem preço próprio, o job do Groq entrava no histórico com o preço do
  // DeepSeek — o /ai-costs mostraria um número que nunca foi cobrado.
  it('cobra o preço do Groq no modelo do Groq', () => {
    const groq = estimateCostUsd('llama-3.3-70b-versatile', usage);

    expect(groq).toBeGreaterThan(0);
    expect(groq).not.toBe(estimateCostUsd('deepseek-v4-flash', usage));
  });

  it('não cobra nada quando não houve uso', () => {
    expect(estimateCostUsd('llama-3.3-70b-versatile', {})).toBe(0);
  });
});
