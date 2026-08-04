import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from '@/lib/ai/cost';
import { DEFAULT_GROQ_MODEL } from '@/lib/ai/groq';

const usage = { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 };

describe('estimateCostUsd', () => {
  it('cobra o preço do modelo do DeepSeek que rodou', () => {
    expect(estimateCostUsd('deepseek-v4-flash', usage)).toBe(0.42);
    expect(estimateCostUsd('deepseek-v4-pro', usage)).toBe(1.305);
  });

  // Sem preço próprio, o job do Groq entrava no histórico com o preço do
  // DeepSeek — o /ai-costs mostraria um número que nunca foi cobrado.
  it('cobra o preço do Groq no modelo do Groq', () => {
    const groq = estimateCostUsd(DEFAULT_GROQ_MODEL, usage);

    expect(groq).toBeGreaterThan(0);
    expect(groq).not.toBe(estimateCostUsd('deepseek-v4-flash', usage));
  });

  // O padrão foi escolhido por preço: o gpt-oss-20b sai mais barato que o
  // llama-70b, e o fallback só entra quando algo já deu errado — não é hora
  // de gastar mais do que o principal.
  it('o modelo padrão do Groq é o mais barato dos dois cadastrados', () => {
    expect(DEFAULT_GROQ_MODEL).toBe('openai/gpt-oss-20b');
    expect(estimateCostUsd(DEFAULT_GROQ_MODEL, usage))
      .toBeLessThan(estimateCostUsd('llama-3.3-70b-versatile', usage));
  });

  it('não cobra nada quando não houve uso', () => {
    expect(estimateCostUsd(DEFAULT_GROQ_MODEL, {})).toBe(0);
  });
});
