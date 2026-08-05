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

  it('Studio fora do ar: cai no espelho, sem previa e sem grade vazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { online, cards } = await listStudioTemplates();
    expect(online).toBe(false);
    expect(cards.length).toBe(7);
    expect(cards.every((card) => card.previewUrl === null)).toBe(true);
  });

  it('catalogo vazio conta como fora do ar: grade vazia mentiria', async () => {
    respondeCom({ templates: [] });
    const { online, cards } = await listStudioTemplates();
    expect(online).toBe(false);
    expect(cards.length).toBe(7);
  });
});
