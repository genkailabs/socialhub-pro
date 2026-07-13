import { describe, it, expect } from 'vitest';
import { pickRelevantCaptions } from '@/lib/ai/dna/captions';
import { htmlToText } from '@/lib/ai/dna/website';
import { buildDnaPrompt } from '@/lib/ai/dna/prompt';
import { normalizeDnaResult } from '@/lib/ai/dna/normalize';

describe('pickRelevantCaptions', () => {
  it('descarta vazias e ordena por tamanho/densidade, limita a N', () => {
    const media = [
      { caption: '' },
      { caption: 'oi' },
      { caption: 'Legenda longa e rica com dicas e chamada para ação clara aqui.' },
      { caption: 'Promoção! 🔥 link na bio' }
    ];
    const out = pickRelevantCaptions(media, 2);
    expect(out.length).toBe(2);
    expect(out[0]).toContain('Legenda longa');
    expect(out.every((c) => c.trim().length > 0)).toBe(true);
  });
  it('lida com lista vazia', () => {
    expect(pickRelevantCaptions([], 12)).toEqual([]);
  });
});

describe('htmlToText', () => {
  it('remove tags/script/style e colapsa espaços', () => {
    const html = '<html><head><style>a{}</style><script>x()</script></head><body><h1>Missão</h1><p>Café  especial</p></body></html>';
    const t = htmlToText(html, 1000);
    expect(t).toContain('Missão');
    expect(t).toContain('Café especial');
    expect(t).not.toContain('x()');
  });
  it('trunca no limite', () => {
    expect(htmlToText('<p>' + 'a'.repeat(500) + '</p>', 100).length).toBeLessThanOrEqual(100);
  });
});

describe('buildDnaPrompt', () => {
  it('system tem as 6 lentes e pede JSON; user injeta fontes', () => {
    const { system, user } = buildDnaPrompt({
      brandName: 'Café X',
      sources: { manual: { tone: 'acolhedor' }, ig: { bio: 'o melhor café', captions: ['dica 1'] }, website: 'missão: café', pasted: 'briefing' }
    });
    for (const lente of ['Branding', 'Instagram', 'Copywriting', 'Design', 'Growth', 'Concorrência']) {
      expect(system).toContain(lente);
    }
    expect(system.toLowerCase()).toContain('json');
    expect(system).toContain('confidence');
    expect(user).toContain('Café X');
    expect(user).toContain('o melhor café');
  });
});

describe('normalizeDnaResult', () => {
  it('parseia JSON e garante disclaimer + clamp de notas', () => {
    const raw = JSON.stringify({ dna: { tone: 'x', formality: 'alta' }, report: { overall: 99, categories: [{ key: 'branding', score: 12, confidence: 'alta', basis: 'ok' }] } });
    const out = normalizeDnaResult(raw, { hasIg: false });
    expect(out.dna.tone).toBe('x');
    expect(out.report.overall).toBeLessThanOrEqual(10);
    expect(out.report.categories[0].score).toBeLessThanOrEqual(10);
    expect(out.report.disclaimer).toMatch(/qualitativa/i);
  });
  it('sem IG rebaixa confiança de categorias dependentes de feed', () => {
    const raw = JSON.stringify({ dna: {}, report: { categories: [{ key: 'instagram', score: 8, confidence: 'alta', basis: '' }] } });
    const out = normalizeDnaResult(raw, { hasIg: false });
    expect(out.report.categories[0].confidence).toBe('baixa');
  });
  it('JSON inválido lança', () => {
    expect(() => normalizeDnaResult('nope', {})).toThrow();
  });
});
