import 'server-only';

const API_URL = 'https://api.tavily.com/search';

// Cliente da Tavily Search API (pesquisa web para LLM). Server-side. Devolve no
// MESMO formato que o motor de pesquisa espera: { summary, sources }. `answer`
// é o resumo pronto; sem ele, monta o resumo a partir do conteúdo dos results.
// As sources ficam para log/cache — nunca vão para a UI.
export async function tavilySearch({ query, maxResults = 5, searchDepth = 'basic', topic = 'general' }) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error('TAVILY_API_KEY não configurada no servidor.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      include_answer: true,
      search_depth: searchDepth,
      topic,
      max_results: maxResults
    }),
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message;
    throw new Error(`Tavily: ${msg || res.statusText || 'falha na chamada'}`);
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const summary = String(data.answer || '').trim()
    || results.map((r) => r.content).filter(Boolean).join('\n\n').trim();
  const sources = results
    .map((r) => r.url && { uri: r.url, title: r.title || '' })
    .filter(Boolean);

  return { summary, sources, model: 'tavily-search' };
}
