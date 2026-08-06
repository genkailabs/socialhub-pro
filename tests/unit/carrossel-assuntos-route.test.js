import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createTrendsResearchCacheClient: vi.fn(),
  researchContext: vi.fn(),
  runSkill: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/instagram-trends-cache', () => ({
  createTrendsResearchCacheClient: mocks.createTrendsResearchCacheClient
}));
vi.mock('@/lib/ai/research', () => ({
  ResearchUnavailableError: class ResearchUnavailableError extends Error {},
  researchContext: mocks.researchContext
}));
vi.mock('@/lib/ai/skills/run', () => ({ runSkill: mocks.runSkill }));

import { POST } from '@/app/api/carrossel/assuntos/route';

const BRAND_ID = '123e4567-e89b-42d3-a456-426614174000';

function query(result) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result)
  };
}

function pedir(body) {
  return POST(new Request('http://localhost/api/carrossel/assuntos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }));
}

function assunto(index, extra = {}) {
  return {
    titulo: `Acontecimento ${index}`,
    resumo: 'O que aconteceu, contado pela fonte.',
    angulo: 'A leitura que o carrossel vai defender.',
    relacaoComNicho: 'Por que o público desta marca se importa.',
    confirmado: true,
    sourceIds: ['source-1'],
    ...extra
  };
}

describe('POST /api/carrossel/assuntos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const brandQuery = query({ data: { id: BRAND_ID, name: 'Acme', category: 'barbearia' } });
    const kitQuery = query({ data: { niche: 'barbearia de bairro', audience: 'homens de 25 a 45' } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn((table) => (table === 'brands' ? brandQuery : kitQuery))
    });
    mocks.createTrendsResearchCacheClient.mockReturnValue({ kind: 'admin-cache-client' });
    mocks.researchContext.mockResolvedValue({
      summary: 'Pesquisa atual.',
      sources: [{
        url: 'https://exemplo.com/noticia',
        title: 'A notícia',
        publisher: 'Portal Exemplo',
        publishedAt: '2026-07-30T12:00:00.000Z'
      }],
      model: 'gemini-search',
      cached: false
    });
    mocks.runSkill.mockResolvedValue({ data: { assuntos: [assunto(1), assunto(2)] } });
  });

  it('pesquisa pelo nicho da marca e devolve assuntos com fonte e data', async () => {
    const response = await pedir({ brandId: BRAND_ID, contentType: 'analise-tendencia' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.origem).toBe('busca');
    expect(body.assuntos).toHaveLength(2);
    expect(body.assuntos[0].fontes[0]).toMatchObject({ publisher: 'Portal Exemplo', data: '30/07/2026' });
    // A pergunta da pesquisa muda com o nicho: barbearia procura em moda e beleza.
    expect(mocks.researchContext.mock.calls[0][0].brief.topic).toContain('revistas de moda e beleza');
    expect(mocks.researchContext).toHaveBeenCalledWith(expect.objectContaining({
      supabase: { kind: 'admin-cache-client' }
    }));
  });

  it('material colado dispensa a pesquisa web e ainda vira assunto', async () => {
    mocks.runSkill.mockResolvedValue({ data: { assuntos: [assunto(1, { sourceIds: [] })] } });

    const material = 'Transcrição do vídeo: a marca trocou anúncios por vídeos gravados pelos próprios funcionários e o alcance cresceu.';
    const response = await pedir({ brandId: BRAND_ID, contentType: 'case-sucesso', material });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.origem).toBe('material');
    expect(mocks.researchContext).not.toHaveBeenCalled();
    expect(mocks.runSkill.mock.calls[0][0].input.research.summary).toBe(material);
    expect(body.assuntos[0].fontes).toEqual([]);
  });

  // Link é endereço, não conteúdo: quem cola um link quer o que está lá dentro,
  // com veículo e data — e isso só a pesquisa traz.
  it('link sozinho continua caindo na pesquisa', async () => {
    await pedir({ brandId: BRAND_ID, contentType: 'analise-tendencia', material: 'https://exemplo.com/materia-que-eu-vi-hoje-de-manha' });

    expect(mocks.researchContext).toHaveBeenCalledTimes(1);
    expect(mocks.researchContext.mock.calls[0][0].brief.topic).toContain('https://exemplo.com/materia-que-eu-vi-hoje-de-manha');
  });

  it('pesquisa sem fonte não inventa assunto', async () => {
    mocks.researchContext.mockResolvedValue({ summary: 'Nada firme.', sources: [], model: null, cached: false });

    const response = await pedir({ brandId: BRAND_ID, contentType: 'analise-tendencia' });

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/Nenhum assunto foi inventado/);
    expect(mocks.runSkill).not.toHaveBeenCalled();
  });

  it('assunto sem fonte citada é descartado na busca, e a rota diz isso', async () => {
    mocks.runSkill.mockResolvedValue({ data: { assuntos: [assunto(1, { sourceIds: [] }), assunto(2, { sourceIds: [] })] } });

    const response = await pedir({ brandId: BRAND_ID, contentType: 'analise-tendencia' });

    expect(response.status).toBe(502);
    expect((await response.json()).error).toMatch(/não produziu assuntos com fonte e data/);
  });

  it('fonte inventada derruba a resposta inteira', async () => {
    mocks.runSkill.mockResolvedValue({ data: { assuntos: [assunto(1, { sourceIds: ['source-99'] })] } });

    const response = await pedir({ brandId: BRAND_ID, contentType: 'analise-tendencia' });

    expect(response.status).toBe(502);
    expect((await response.json()).error).toMatch(/fonte que não existe/);
  });

  it('tipo que não pesquisa assunto não gasta pesquisa', async () => {
    const response = await pedir({ brandId: BRAND_ID, contentType: 'lista' });

    expect(response.status).toBe(400);
    expect(mocks.researchContext).not.toHaveBeenCalled();
  });
});
