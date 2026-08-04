import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

const mocks = vi.hoisted(() => ({ pollinationsSearch: vi.fn(), lookup: vi.fn(), httpsRequest: vi.fn(), httpRequest: vi.fn() }));
vi.mock('@/lib/ai/pollinations-search', () => ({ pollinationsSearch: mocks.pollinationsSearch }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup, default: { lookup: mocks.lookup } }));
vi.mock('node:https', () => ({ request: mocks.httpsRequest, default: { request: mocks.httpsRequest } }));
vi.mock('node:http', () => ({ request: mocks.httpRequest, default: { request: mocks.httpRequest } }));

import { needsResearch, buildResearchQuery, researchContext, ResearchUnavailableError } from '@/lib/ai/research';

// Fake mínimo do client Supabase p/ o cache. `row` = o que o SELECT devolve
// (null = miss). Registra o que foi gravado em `upserts`.
function fakeSupabase({ row = null } = {}) {
  const upserts = [];
  return {
    upserts,
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        gte() { return this; },
        maybeSingle: async () => ({ data: row, error: null }),
        upsert: async (payload) => { upserts.push(payload); return { error: null }; }
      };
    }
  };
}

function respondWith({ statusCode = 200, headers = { 'content-type': 'text/html' }, chunks = [] } = {}) {
  respondSequence([{ statusCode, headers, chunks }]);
}

// Uma resposta por chamada, na ordem. Serve para provar o salto de redirect:
// a primeira devolve 302, a segunda a página de verdade.
function respondSequence(steps) {
  let call = 0;
  mocks.httpsRequest.mockImplementation((_url, _options, callback) => {
    const step = steps[Math.min(call, steps.length - 1)];
    call += 1;
    const request = new EventEmitter();
    request.end = () => {
      const response = new EventEmitter();
      response.statusCode = step.statusCode ?? 200;
      response.headers = step.headers ?? { 'content-type': 'text/html' };
      response.destroy = vi.fn();
      response.resume = vi.fn();
      callback(response);
      queueMicrotask(() => {
        (step.chunks || []).forEach((chunk) => response.emit('data', Buffer.from(chunk)));
        response.emit('end');
      });
    };
    request.destroy = vi.fn();
    return request;
  });
}

const PAGE = '<html><head><meta property="og:site_name" content="Publicador"><meta property="article:published_time" content="2026-07-20T10:00:00.000Z"><meta name="description" content="Resumo da pagina."></head></html>';

describe('needsResearch', () => {
  it('gatilho textual → true', () => {
    expect(needsResearch({ topic: 'notícia sobre IA hoje' })).toBe(true);
    expect(needsResearch({ topic: 'lançamento do iPhone' })).toBe(true);
    expect(needsResearch({ topic: 'tendências 2026' })).toBe(true);
  });
  it('acento ausente ainda dispara', () => {
    expect(needsResearch({ topic: 'ultimas noticias de tecnologia' })).toBe(true);
    expect(needsResearch({ topic: 'tendencia do momento' })).toBe(true);
  });
  it('formato notícia (texto livre) sempre pesquisa', () => {
    expect(needsResearch({ format: 'news' })).toBe(true);
    expect(needsResearch({ format: 'Notícia' })).toBe(true);
    expect(needsResearch({ topic: 'qualquer', format: 'Notícia comentada' })).toBe(true);
  });
  it('formato livre não-notícia usa só o gatilho do tema', () => {
    expect(needsResearch({ format: 'Parecer Simplificado', topic: 'contrato de aluguel' })).toBe(false);
  });
  // No Composer o formato é o do canvas ('post'); quem diz "isto é notícia" é o
  // tipo de peça da Estratégia. Antes ele não chegava aqui e a peça saía sem
  // pesquisa nenhuma, apesar do usuário ter marcado Notícia.
  it('tipo de peça Notícia pesquisa mesmo com formato de canvas', () => {
    expect(needsResearch({ format: 'post', pieceType: 'Notícia', topic: 'reforma tributária' })).toBe(true);
    expect(needsResearch({ format: 'post', pieceType: 'Editorial', topic: 'reforma tributária' })).toBe(false);
  });
  it('flag explícita força pesquisa (modo avançado)', () => {
    expect(needsResearch({ topic: 'dicas de foco', format: 'quote', research: true })).toBe(true);
  });
  it('tema atemporal → false', () => {
    expect(needsResearch({ topic: 'dicas de foco', format: 'tips_carousel' })).toBe(false);
    expect(needsResearch({ topic: 'frase motivacional', format: 'quote' })).toBe(false);
    expect(needsResearch({ topic: '', format: 'promo' })).toBe(false);
  });
});

describe('buildResearchQuery', () => {
  it('inclui tema e nicho', () => {
    const q = buildResearchQuery({ brief: { topic: 'IA generativa' }, kit: { niche: 'tecnologia' } });
    expect(q).toContain('IA generativa');
    expect(q).toContain('tecnologia');
  });
  it('é determinístico', () => {
    const a = buildResearchQuery({ brief: { topic: 'x' }, kit: { niche: 'y' } });
    const b = buildResearchQuery({ brief: { topic: 'x' }, kit: { niche: 'y' } });
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('researchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lookup.mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
    respondWith({ chunks: [PAGE] });
    process.env.POLLINATIONS_SECRET_KEY = 'test';
  });

  it('summary não-vazio → sucesso com custo', async () => {
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'contexto atual', sources: [{ uri: 'https://a.com', title: 'A' }],
      usage: { prompt_tokens: 100, completion_tokens: 50 }, model: 'gemini-search'
    });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: { niche: 'tech' } });

    expect(out.summary).toBe('contexto atual');
    expect(out.sources).toHaveLength(1);
    expect(out.cached).toBe(false);
    expect(out.cost).toBeGreaterThan(0);
    expect(mocks.pollinationsSearch).toHaveBeenCalledTimes(1);
  });

  it('enriches a provider uri/title source with page evidence before returning it', async () => {
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'Titulo do provedor' }], model: 'gemini-search'
    });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(mocks.httpsRequest).toHaveBeenCalledTimes(1);
    const [, options] = mocks.httpsRequest.mock.calls[0];
    expect(options).toMatchObject({ servername: 'publisher.example.com', headers: expect.objectContaining({ host: 'publisher.example.com' }) });
    await expect(new Promise((resolve, reject) => options.lookup('publisher.example.com', {}, (error, address, family) => error ? reject(error) : resolve({ address, family })))).resolves.toEqual({ address: '8.8.8.8', family: 4 });
    expect(out.sources).toEqual([expect.objectContaining({
      url: 'https://publisher.example.com/report',
      title: 'Titulo do provedor',
      publisher: 'Publicador',
      publishedAt: '2026-07-20T10:00:00.000Z',
      summary: 'Resumo da pagina.'
    })]);
  });

  it('rejects a provider uri/title source when page metadata cannot complete evidence', async () => {
    respondWith({ chunks: ['<html><head></head></html>'] });
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'Titulo do provedor' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([]);
  });

  it('rejects a private IPv4-mapped IPv6 resolution without opening a connection', async () => {
    mocks.lookup.mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }]);
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'Titulo do provedor' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([]);
    expect(mocks.httpsRequest).not.toHaveBeenCalled();
  });

  it('semantically rejects a hexadecimal IPv4-mapped IPv6 resolution before pinned connect', async () => {
    mocks.lookup.mockResolvedValue([{ address: '::ffff:7f00:1', family: 6 }]);
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'Titulo do provedor' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([]);
    expect(mocks.httpsRequest).not.toHaveBeenCalled();
  });

  // O Gemini nunca entrega o link do veículo: entrega um redirect do
  // `vertexaisearch.cloud.google.com`. Recusar 3xx aqui descartava TODAS as
  // fontes de toda pesquisa — a tela dizia "nenhuma fonte verificável" com 14
  // fontes na mão. Seguimos o salto, revalidando o destino a cada hop.
  it('segue o redirect de grounding e guarda a URL final do veículo', async () => {
    respondSequence([
      { statusCode: 302, headers: { location: 'https://publisher.example.com/report', 'content-type': 'text/html' } },
      { statusCode: 200, headers: { 'content-type': 'text/html' }, chunks: [PAGE] }
    ]);
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'contexto atual',
      sources: [{ uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', title: 'Titulo do provedor' }],
      model: 'gemini-search'
    });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(mocks.httpsRequest).toHaveBeenCalledTimes(2);
    expect(out.sources).toEqual([expect.objectContaining({ url: 'https://publisher.example.com/report', publisher: 'Publicador' })]);
  });

  it('revalida o destino do redirect: salto para IP privado é descartado', async () => {
    respondSequence([{ statusCode: 302, headers: { location: 'https://interno.example.com/', 'content-type': 'text/html' } }]);
    mocks.lookup
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://redirector.example.com/x', title: 'T' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([]);
    expect(mocks.httpsRequest).toHaveBeenCalledTimes(1);
  });

  it('corrente de redirects sem fim para no limite de saltos', async () => {
    respondSequence([{ statusCode: 302, headers: { location: 'https://loop.example.com/next', 'content-type': 'text/html' } }]);
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://loop.example.com/start', title: 'T' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([]);
    expect(mocks.httpsRequest.mock.calls.length).toBeLessThanOrEqual(4);
  });

  // Metatag de data é opcional na web real; JSON-LD é o padrão de quem publica
  // notícia. Exigir só a metatag derrubava veículo bom por falta de uma tag.
  it('completa veículo e data pelo JSON-LD quando faltam metatags', async () => {
    respondWith({ chunks: [`<html><head>
      <meta property="og:title" content="Formatos que crescem no Instagram">
      <meta name="description" content="Resumo da pagina.">
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"NewsArticle","datePublished":"2026-07-30T09:00:00-03:00","publisher":{"@type":"Organization","name":"Veiculo LD"}}]}</script>
    </head></html>`] });
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: '' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([expect.objectContaining({
      title: 'Formatos que crescem no Instagram',
      publisher: 'Veiculo LD',
      publishedAt: new Date('2026-07-30T09:00:00-03:00').toISOString()
    })]);
  });

  it('sem veículo declarado, o domínio responde pela fonte', async () => {
    respondWith({ chunks: ['<html><head><meta property="og:title" content="Titulo"><meta name="description" content="Resumo."><meta name="date" content="2026-07-28"></head></html>'] });
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://www.publisher.example.com/report', title: '' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([expect.objectContaining({ publisher: 'publisher.example.com' })]);
  });

  // Data continua obrigatória: sem ela a "fonte" não prova quando aquilo foi
  // publicado, e o carrossel citaria evidência sem idade.
  it('página sem data nenhuma continua descartada', async () => {
    respondWith({ chunks: ['<html><head><meta property="og:title" content="Titulo"><meta name="description" content="Resumo."></head></html>'] });
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: '' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([]);
  });

  // Portal de notícia passa de 256KB com folga. Recusar a página inteira por
  // tamanho jogava fora veículo bom; o teto agora corta a leitura e o `<head>`,
  // que é onde a evidência mora, continua sendo lido.
  it('lê o cabeçalho de uma página gigante e para no teto de bytes', async () => {
    respondWith({ chunks: [PAGE, 'x'.repeat(256 * 1024 + 1), 'y'.repeat(1024)] });
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'Titulo do provedor' }], model: 'gemini-search' });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toEqual([expect.objectContaining({ url: 'https://publisher.example.com/report', publisher: 'Publicador' })]);
  });

  it('entrega no máximo cinco fontes, que é o teto de entrada das skills', async () => {
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'contexto atual',
      sources: Array.from({ length: 8 }, (_, index) => ({ uri: `https://publisher.example.com/report-${index}`, title: `Fonte ${index}` })),
      model: 'gemini-search'
    });

    const out = await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    expect(out.sources).toHaveLength(5);
  });

  // O Node pede `all: true` (autoSelectFamily) e espera um array de volta.
  // Devolver no formato antigo derrubava TODA conexão de evidência com
  // "Invalid IP address: undefined" — em produção, nenhuma fonte era lida.
  it('responde ao lookup no formato de array quando o Node pede all', async () => {
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'T' }], model: 'gemini-search' });

    await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    const [, options] = mocks.httpsRequest.mock.calls[0];
    await expect(new Promise((resolve, reject) => options.lookup('publisher.example.com', { all: true }, (error, result) => error ? reject(error) : resolve(result))))
      .resolves.toEqual([{ address: '8.8.8.8', family: 4 }]);
  });

  it('prefere o endereço IPv4 quando o DNS devolve AAAA na frente', async () => {
    mocks.lookup.mockResolvedValue([{ address: '2800:3f0:4001:80b::200e', family: 6 }, { address: '172.217.162.14', family: 4 }]);
    mocks.pollinationsSearch.mockResolvedValue({ summary: 'contexto atual', sources: [{ uri: 'https://publisher.example.com/report', title: 'T' }], model: 'gemini-search' });

    await researchContext({ brief: { topic: 'IA hoje', format: 'news' }, kit: {} });

    const [, options] = mocks.httpsRequest.mock.calls[0];
    await expect(new Promise((resolve, reject) => options.lookup('publisher.example.com', {}, (error, address, family) => error ? reject(error) : resolve({ address, family }))))
      .resolves.toEqual({ address: '172.217.162.14', family: 4 });
  });

  it('summary vazio → lança ResearchUnavailableError', async () => {
    mocks.pollinationsSearch.mockResolvedValue({ summary: '', sources: [], usage: {}, model: 'gemini-search' });

    await expect(researchContext({ brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
  });

  it('Pollinations falha → lança ResearchUnavailableError com code', async () => {
    mocks.pollinationsSearch.mockRejectedValue(new Error('quota'));

    await expect(researchContext({ brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toMatchObject({ code: 'research_unavailable' });
  });

  it('cache hit (<6h) → não chama Pollinations, custo zero', async () => {
    const supabase = fakeSupabase({
      row: { summary: 'do cache', sources: [{ uri: 'https://c.com', title: 'C' }], model: 'gemini-search', created_at: new Date().toISOString() }
    });

    const out = await researchContext({ supabase, brief: { topic: 'IA hoje' }, kit: {} });

    expect(out.summary).toBe('do cache');
    expect(out.cached).toBe(true);
    expect(out.cost).toBe(0);
    expect(mocks.pollinationsSearch).not.toHaveBeenCalled();
    expect(supabase.upserts).toHaveLength(0);
  });

  it('cache miss sem fonte validada → consulta Pollinations sem gravar um cache inútil', async () => {
    mocks.pollinationsSearch.mockResolvedValue({
      summary: 'fresco', sources: [], usage: { prompt_tokens: 10, completion_tokens: 5 }, model: 'gemini-search'
    });
    const supabase = fakeSupabase({ row: null });

    const out = await researchContext({ supabase, brief: { topic: 'IA hoje' }, kit: {} });

    expect(out.cached).toBe(false);
    expect(mocks.pollinationsSearch).toHaveBeenCalledTimes(1);
    expect(supabase.upserts).toHaveLength(0);
  });

  it('falha na pesquisa nunca grava cache', async () => {
    mocks.pollinationsSearch.mockRejectedValue(new Error('down'));
    const supabase = fakeSupabase({ row: null });

    await expect(researchContext({ supabase, brief: { topic: 'IA hoje' }, kit: {} }))
      .rejects.toBeInstanceOf(ResearchUnavailableError);
    expect(supabase.upserts).toHaveLength(0);
  });
});
