import { describe, expect, it } from 'vitest';
import { buildSuggestionsPrompt, parseSuggestions } from '@/lib/ai/suggestions';

describe('buildSuggestionsPrompt', () => {
  it('inclui tema e nicho no prompt', () => {
    const { user, system } = buildSuggestionsPrompt({ topic: 'Vibe Coding', niche: 'tecnologia' });
    expect(user).toContain('Vibe Coding');
    expect(user).toContain('tecnologia');
    expect(typeof system).toBe('string');
    expect(system).toMatch(/4/); // pede 4 sugestões
  });
  it('funciona sem nicho (marca sem Brand Kit)', () => {
    const { user } = buildSuggestionsPrompt({ topic: 'economia' });
    expect(user).toContain('economia');
  });
});

describe('parseSuggestions', () => {
  it('parseia JSON válido e normaliza os 4 itens', () => {
    const json = JSON.stringify({
      suggestions: [
        { title: 'O que é Vibe Coding?', description: 'Explicação para não-devs', impliedFormat: 'Explicação didática', impliedTone: 'Didático' },
        { title: '5 ferramentas', description: 'Tutorial prático', impliedFormat: 'Tutorial passo a passo', impliedTone: 'Descontraído' },
        { title: 'Mito vs Realidade', description: 'Desmistificando', impliedFormat: 'Mito vs. Realidade', impliedTone: 'Autoritário' },
        { title: 'Notícias do tema', description: 'Atualidade', impliedFormat: 'Notícia comentada', impliedTone: 'Profissional' }
      ]
    });
    const out = parseSuggestions(json);
    expect(out).toHaveLength(4);
    expect(out[0]).toEqual({ title: 'O que é Vibe Coding?', description: 'Explicação para não-devs', impliedFormat: 'Explicação didática', impliedTone: 'Didático' });
  });
  it('descarta itens sem title/impliedFormat e limita a 4', () => {
    const json = JSON.stringify({
      suggestions: [
        { title: 'A', description: 'd', impliedFormat: 'F1', impliedTone: 'T1' },
        { description: 'sem title', impliedFormat: 'F2' },
        { title: 'C', impliedFormat: 'F3', impliedTone: 'T3' },
        { title: 'D', impliedFormat: 'F4', impliedTone: 'T4' },
        { title: 'E', impliedFormat: 'F5', impliedTone: 'T5' }
      ]
    });
    const out = parseSuggestions(json);
    expect(out).toHaveLength(4);
    expect(out.map((s) => s.title)).toEqual(['A', 'C', 'D', 'E']);
  });
  it('JSON inválido lança erro', () => {
    expect(() => parseSuggestions('não é json')).toThrow();
  });
  it('sem array suggestions devolve lista vazia', () => {
    expect(parseSuggestions('{}')).toEqual([]);
  });
  it('trunca campos longos', () => {
    const json = JSON.stringify({ suggestions: [{ title: 'x'.repeat(200), description: 'y'.repeat(400), impliedFormat: 'z'.repeat(200), impliedTone: 'w'.repeat(200) }] });
    const out = parseSuggestions(json);
    expect(out[0].title.length).toBeLessThanOrEqual(100);
    expect(out[0].description.length).toBeLessThanOrEqual(240);
  });
});
