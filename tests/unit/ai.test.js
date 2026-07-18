import { describe, it, expect } from 'vitest';
import { normalizeSpec, parseSpec } from '@/lib/ai/spec';
import { estimateCostUsd, formatUsd, pollinationsImageCostUsd } from '@/lib/ai/cost';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { resolvePalette, TEMPLATES } from '@/lib/ai/templates';
import { renderNode, slideCount } from '@/lib/ai/render';

describe('normalizeSpec', () => {
  it('template inválido cai p/ notícia', () => {
    expect(normalizeSpec({ template: 'xyz' }).template).toBe('news');
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
  it('captura image_prompt (deAPI) e limita tamanho', () => {
    expect(normalizeSpec({ image_prompt: 'cozy cafe, warm light' }).imagePrompt).toBe('cozy cafe, warm light');
    expect(normalizeSpec({ image_prompt: 'x'.repeat(900) }).imagePrompt.length).toBe(600);
    expect(normalizeSpec({}).imagePrompt).toBe('');
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
    expect(c).toBeCloseTo(0.14, 5);
  });
  it('modelo desconhecido usa fallback', () => {
    expect(estimateCostUsd('x', { prompt_tokens: 0, completion_tokens: 1_000_000 })).toBeCloseTo(0.28, 5);
  });
  it('formatUsd mostra 4 casas p/ valor pequeno', () => {
    expect(formatUsd(0.0003)).toBe('$0.0003');
  });
});

describe('pollinationsImageCostUsd', () => {
  it('multiplica pelo nº de imagens', () => {
    expect(pollinationsImageCostUsd(0)).toBe(0);
    expect(pollinationsImageCostUsd(4)).toBeCloseTo(pollinationsImageCostUsd(1) * 4, 6);
  });
  it('trata entrada inválida como zero', () => {
    expect(pollinationsImageCostUsd('x')).toBe(0);
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
  it('formato é texto livre, sem cair p/ notícia (comunicação adaptativa)', () => {
    const { user, format } = buildContentPrompt({ brief: { format: 'Parecer Simplificado', topic: 'LGPD' } });
    expect(format).toBe('Parecer Simplificado');
    expect(user).toContain('Parecer Simplificado');
  });
  it('sem formato definido usa um rótulo genérico', () => {
    expect(buildContentPrompt({ brief: {} }).format).toBe('post para redes sociais');
  });
  it('notícia (detectada por texto) pede post editorial sem chamada comercial', () => {
    const { user, format } = buildContentPrompt({ brief: { format: 'Notícia', topic: 'novidades da IA' } });
    expect(format).toBe('Notícia');
    expect(user).toContain('notícia informativa');
    expect(user).toMatch(/não inventar fatos/i);
  });
  it('formato fora do padrão notícia não recebe as regras editoriais de notícia', () => {
    const { user } = buildContentPrompt({ brief: { format: 'Caso Clínico', topic: 'sono' } });
    expect(user).not.toMatch(/notícia informativa editorial/i);
  });
  it('tom livre entra no prompt quando informado', () => {
    const { user } = buildContentPrompt({ brief: { tone: 'Autoritário e técnico' } });
    expect(user).toContain('Autoritário e técnico');
  });
  it('pede image_prompt no system (p/ a deAPI)', () => {
    expect(buildContentPrompt({}).system).toContain('image_prompt');
  });
  it('injeta contexto atual quando há research, sem vazar fontes', () => {
    const { user } = buildContentPrompt({
      brandKit: { niche: 'tech' },
      brief: { topic: 'IA hoje', format: 'news' },
      research: { summary: 'Modelo X lançado com recurso Y.', sources: [{ uri: 'https://secreta.com/artigo', title: 'Fonte' }] }
    });
    expect(user).toContain('contexto_atual');
    expect(user).toContain('Modelo X lançado com recurso Y.');
    expect(user).not.toContain('https://secreta.com/artigo');
  });
  it('sem research o prompt não menciona contexto atual', () => {
    const { user } = buildContentPrompt({ brandKit: { niche: 'tech' }, brief: { topic: 'IA', format: 'news' } });
    expect(user).not.toContain('contexto_atual');
  });
  it('injeta campos do Brand DNA no user prompt', () => {
    const { user } = buildContentPrompt({
      brandKit: { tone: 'x', personality: ['consultivo'], cta_policy: 'sempre', emoji_usage: 'poucos', storytelling: true, caption_length: 'longa' },
      brief: {}
    });
    expect(user).toContain('consultivo');
    expect(user).toMatch(/CTA|chamada para ação/i);
    expect(user).toMatch(/emoji/i);
  });
  it('aplica orientacoes eticas ao nicho de saude', () => {
    const { user } = buildContentPrompt({ brandKit: { niche: 'medicina' }, brief: { topic: 'sono' } });

    expect(user).toMatch(/nao prometer resultado/i);
    expect(user).toMatch(/nao diagnosticar/i);
    expect(user).toMatch(/educativa e etica/i);
  });
  it('orienta arquitetura para processo e inspiracao visual sem promessas', () => {
    const { user } = buildContentPrompt({ brandKit: { niche: 'arquitetura' }, brief: { topic: 'cozinha pequena' } });

    expect(user).toMatch(/processo, projeto e inspiracao visual/i);
    expect(user).toMatch(/nao prometer resultado/i);
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
  it('inclui notícia como formato padrão', () => {
    expect(TEMPLATES[0]).toBe('news');
    expect(TEMPLATES).toHaveLength(5);
  });
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
