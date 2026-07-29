import { describe, expect, it, vi, afterEach } from 'vitest';
import { pexelsSearch, hasPexelsKey, StockUnavailableError, PEXELS_LICENSE } from '@/lib/ai/pexels';

const FOTO = {
  id: 30326084,
  width: 3654,
  height: 6029,
  url: 'https://www.pexels.com/foto/pao-30326084/',
  photographer: 'Elizaveta Croitoru',
  photographer_url: 'https://www.pexels.com/@elizaveta',
  avg_color: '#7E6853',
  alt: 'Mãos partindo pão rústico.',
  src: { original: 'https://img/original.jpg', large: 'https://img/large.jpg', medium: 'https://img/medium.jpg' }
};

function mockBusca(body = { photos: [FOTO], total_results: 8000, page: 1 }, ok = true, status = 200) {
  const f = vi.fn(async () => ({ ok, status, json: async () => body }));
  vi.stubGlobal('fetch', f);
  return f;
}

const urlDaChamada = (f) => new URL(f.mock.calls[0][0]);

afterEach(() => { vi.unstubAllGlobals(); delete process.env.PEXELS_API_KEY; });

describe('busca no banco de imagens (PRD 02 §2/§3)', () => {
  it('sem chave, avisa que o caminho esta desligado — nao devolve vazio', async () => {
    await expect(pexelsSearch({ query: 'padaria' })).rejects.toBeInstanceOf(StockUnavailableError);
    expect(hasPexelsKey()).toBe(false);
  });

  it('normaliza a foto com origem, autor e licenca (§13)', async () => {
    process.env.PEXELS_API_KEY = 'chave-de-teste';
    mockBusca();
    const { photos, total } = await pexelsSearch({ query: 'padaria artesanal' });
    expect(total).toBe(8000);
    const foto = photos[0];
    expect(foto.id).toBe('30326084');
    expect(foto.alt).toBe('Mãos partindo pão rústico.');
    expect(foto.source).toBe('pexels');
    expect(foto.sourceUrl).toContain('pexels.com');
    expect(foto.photographer).toBe('Elizaveta Croitoru');
    expect(foto.license).toBe(PEXELS_LICENSE);
    expect(foto.full).toBe('https://img/original.jpg');
    expect(foto.thumb).toBe('https://img/medium.jpg');
  });

  it('passa a orientacao adiante e mantem o idioma da busca', async () => {
    process.env.PEXELS_API_KEY = 'chave-de-teste';
    const f = mockBusca();
    await pexelsSearch({ query: 'cafe', orientation: 'portrait' });
    const url = urlDaChamada(f);
    expect(url.searchParams.get('orientation')).toBe('portrait');
    expect(url.searchParams.get('locale')).toBe('pt-BR');
    expect(url.searchParams.get('query')).toBe('cafe');
  });

  // O acervo não tem filtro nativo de pessoa: vira termo na consulta.
  it('traduz o filtro de pessoa em termo de busca', async () => {
    process.env.PEXELS_API_KEY = 'chave-de-teste';
    const f = mockBusca();
    await pexelsSearch({ query: 'escritorio', person: 'sem' });
    expect(urlDaChamada(f).searchParams.get('query')).toBe('escritorio no people object');
  });

  it('consulta vazia nao gasta chamada de rede', async () => {
    process.env.PEXELS_API_KEY = 'chave-de-teste';
    const f = mockBusca();
    const r = await pexelsSearch({ query: '   ' });
    expect(r.photos).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it('limite de consultas vira mensagem que o usuario entende', async () => {
    process.env.PEXELS_API_KEY = 'chave-de-teste';
    mockBusca({}, false, 429);
    await expect(pexelsSearch({ query: 'padaria' })).rejects.toThrow(/limite de consultas/i);
  });

  it('nunca pede mais que o teto de resultados por pagina', async () => {
    process.env.PEXELS_API_KEY = 'chave-de-teste';
    const f = mockBusca();
    await pexelsSearch({ query: 'cafe', perPage: 500 });
    expect(Number(urlDaChamada(f).searchParams.get('per_page'))).toBeLessThanOrEqual(40);
  });
});
