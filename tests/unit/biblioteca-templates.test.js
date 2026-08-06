import { describe, it, expect, vi, afterEach } from 'vitest';
import { listStudioTemplates, objetivosDoTemplate, tiposDoTemplate } from '@/lib/carrossel-templates';

afterEach(() => { vi.unstubAllGlobals(); });

function respondeCom(payload, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => payload })));
}

describe('objetivos de um template', () => {
  it('vem dos tipos que usam aquele template, nao de lista paralela', () => {
    // editorial-dark é o template sugerido da análise de tendência, que é de
    // descoberta. Se o vínculo mudar em carrossel-tipos.js, isto acompanha.
    expect(tiposDoTemplate('editorial-dark').length).toBeGreaterThan(0);
    expect(objetivosDoTemplate('editorial-dark').map((o) => o.id)).toContain('descoberta');
  });

  it('template sem tipo associado nao inventa objetivo', () => {
    expect(objetivosDoTemplate('template-que-nao-existe')).toEqual([]);
  });
});

describe('listStudioTemplates', () => {
  it('monta o link ja com formato, template e tipo', async () => {
    respondeCom({ templates: [{ id: 'editorial-dark', name: 'Editorial Noturno', blurb: 'x', funnelStage: 'Topo', preview: '/templates/editorial-dark.png' }] });
    const { online, cards } = await listStudioTemplates();
    expect(online).toBe(true);
    expect(cards[0].href).toContain('format=carrossel');
    expect(cards[0].href).toContain('template=editorial-dark');
    expect(cards[0].href).toContain('tipo=');
    expect(cards[0].previewUrl).toContain('/templates/editorial-dark.png');
  });

  it('leva a lista de slides da previa, absoluta no Studio', async () => {
    respondeCom({ templates: [{ id: 'editorial-dark', name: 'x', blurb: 'x', funnelStage: 'Topo', preview: '/templates/editorial-dark.png', previewSlides: ['/templates/editorial-dark.png', '/templates/editorial-dark--2.png'] }] });
    const { cards } = await listStudioTemplates();
    expect(cards[0].previewSlides).toHaveLength(2);
    expect(cards[0].previewSlides[1]).toMatch(/^https?:\/\/.+\/templates\/editorial-dark--2\.png$/);
  });

  it('Studio fora do ar: sem lista de slides, em vez de link quebrado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { cards } = await listStudioTemplates();
    expect(cards.every((card) => card.previewSlides.length === 0)).toBe(true);
  });

  it('Studio fora do ar: cai no espelho, sem previa e sem grade vazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { online, cards } = await listStudioTemplates();
    expect(online).toBe(false);
    expect(cards.length).toBe(20);
    expect(cards.every((card) => card.previewUrl === null)).toBe(true);
  });

  it('todo template do espelho aparece em algum objetivo', async () => {
    // Template sem tipo ligado some do filtro por objetivo. Vinte formas e oito
    // tipos só convivem se cada forma estiver ligada a pelo menos um tipo.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { cards } = await listStudioTemplates();
    const orfaos = cards.filter((card) => !card.objetivos.length).map((card) => card.id);
    expect(orfaos).toEqual([]);
  });

  it('leva adiante de qual referencia o layout foi derivado', async () => {
    respondeCom({ templates: [{ id: 'palavra-marcada', name: 'Palavra Marcada', blurb: 'x', funnelStage: 'Topo', reference: 'Carrossel 01, slides 3 e 8 (P1 + P9)' }] });
    const { cards } = await listStudioTemplates();
    expect(cards[0].reference).toContain('P1');
  });

  it('catalogo vazio conta como fora do ar: grade vazia mentiria', async () => {
    respondeCom({ templates: [] });
    const { online, cards } = await listStudioTemplates();
    expect(online).toBe(false);
    expect(cards.length).toBe(20);
  });
});
