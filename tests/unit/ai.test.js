import { describe, it, expect } from 'vitest';
import { normalizeSpec, parseSpec } from '@/lib/ai/spec';
import { estimateCostUsd, formatUsd } from '@/lib/ai/cost';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { resolvePalette, TEMPLATES } from '@/lib/ai/templates';
import { renderNode, slideCount } from '@/lib/ai/render';

describe('normalizeSpec', () => {
  it('template inválido cai p/ quote', () => {
    expect(normalizeSpec({ template: 'xyz' }).template).toBe('quote');
  });
  it('carrossel força >=2 slides', () => {
    const s = normalizeSpec({ template: 'tips_carousel', bullets: ['a', 'b', 'c'] });
    expect(s.template).toBe('tips_carousel');
    expect(s.slides).toBeGreaterThanOrEqual(2);
  });
  it('post único = 1 slide', () => {
    expect(normalizeSpec({ template: 'quote' }).slides).toBe(1);
  });
  it('limita bullets a 6 e normaliza hashtags', () => {
    const s = normalizeSpec({ bullets: Array.from({ length: 9 }, (_, i) => 'b' + i), hashtags: '#a b' });
    expect(s.bullets.length).toBe(6);
    expect(s.hashtags).toEqual(['#a', '#b']);
  });
  it('headline vazio recebe fallback', () => {
    expect(normalizeSpec({}).headline).toBe('Sem título');
  });
});

describe('parseSpec', () => {
  it('parseia JSON string', () => {
    expect(parseSpec('{"template":"promo","caption":"oi"}').caption).toBe('oi');
  });
  it('erro em JSON inválido', () => {
    expect(() => parseSpec('não é json')).toThrow();
  });
});

describe('estimateCostUsd', () => {
  it('calcula por tokens', () => {
    const c = estimateCostUsd('deepseek-chat', { prompt_tokens: 1_000_000, completion_tokens: 0 });
    expect(c).toBeCloseTo(0.27, 5);
  });
  it('modelo desconhecido usa fallback', () => {
    expect(estimateCostUsd('x', { prompt_tokens: 0, completion_tokens: 1_000_000 })).toBeCloseTo(1.10, 5);
  });
  it('formatUsd mostra 4 casas p/ valor pequeno', () => {
    expect(formatUsd(0.0003)).toBe('$0.0003');
  });
});

describe('buildContentPrompt', () => {
  it('inclui nicho e tema no user prompt', () => {
    const { user, system, format } = buildContentPrompt({ brandKit: { niche: 'cafeteria' }, brief: { topic: 'grãos especiais', format: 'tips_carousel' } });
    expect(user).toContain('cafeteria');
    expect(user).toContain('grãos especiais');
    expect(format).toBe('tips_carousel');
    expect(typeof system).toBe('string');
  });
  it('formato inválido cai p/ quote', () => {
    expect(buildContentPrompt({ brief: { format: 'zzz' } }).format).toBe('quote');
  });
});

describe('resolvePalette', () => {
  it('preenche defaults', () => {
    const p = resolvePalette({ accent: '#ff0000' });
    expect(p.accent).toBe('#ff0000');
    expect(p.bg).toBeTruthy();
  });
  it('aceita primary como accent', () => {
    expect(resolvePalette({ primary: '#123456' }).accent).toBe('#123456');
  });
});

describe('TEMPLATES', () => {
  it('tem os 4 templates', () => expect(TEMPLATES).toHaveLength(4));
});

describe('renderNode', () => {
  for (const t of TEMPLATES) {
    it(`monta um nó válido p/ ${t}`, () => {
      const node = renderNode({ template: t, spec: { headline: 'Oi', subtext: 'sub', bullets: ['a', 'b'], brand: 'marca' }, palette: {}, slideIndex: 0 });
      expect(node.type).toBe('div');
      expect(Array.isArray(node.props.children)).toBe(true);
      expect(node.props.style.display).toBe('flex');
    });
  }
  it('slide de dica do carrossel usa o índice', () => {
    const node = renderNode({ template: 'tips_carousel', spec: { bullets: ['primeira', 'segunda'] }, palette: {}, slideIndex: 2 });
    expect(node.type).toBe('div');
  });
});

describe('slideCount', () => {
  it('post único = 1', () => expect(slideCount({ template: 'quote' })).toBe(1));
  it('carrossel = capa + dicas', () => expect(slideCount({ template: 'tips_carousel', bullets: ['a', 'b', 'c'] })).toBe(4));
  it('carrossel respeita mínimo 2', () => expect(slideCount({ template: 'tips_carousel', bullets: [] })).toBe(2));
});
