import 'server-only';

// Pesquisa web via Pollinations (gen.pollinations.ai), modelo `gemini-search` —
// Gemini com grounding do Google por trás, sem exigir billing no Google Cloud.
// Devolve no MESMO formato que o motor de pesquisa espera: { summary, sources }.
// As sources ficam para log/cache — nunca vão para a UI.
const API_URL = 'https://gen.pollinations.ai/v1/chat/completions';
export const POLLINATIONS_SEARCH_MODEL = process.env.POLLINATIONS_SEARCH_MODEL || 'gemini-search';
export const POLLINATIONS_SEARCH_TIMEOUT_MS = 20_000;

export async function pollinationsSearch({
  query,
  model = POLLINATIONS_SEARCH_MODEL,
  temperature = 0.4,
  timeoutMs = POLLINATIONS_SEARCH_TIMEOUT_MS
}) {
  const key = process.env.POLLINATIONS_SECRET_KEY;
  if (!key) throw new Error('POLLINATIONS_SECRET_KEY não configurada no servidor.');

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature,
        messages: [{ role: 'user', content: query }]
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw new Error('Pollinations: a pesquisa excedeu o tempo limite.');
    }
    throw error;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message;
    throw new Error(`Pollinations: ${msg || res.statusText || 'falha na chamada'}`);
  }

  const choice = data.choices?.[0] || {};
  const summary = String(choice.message?.content || '').trim();
  const sources = (choice.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web && { uri: c.web.uri, title: c.web.title || '' })
    .filter(Boolean);

  return { summary, sources, usage: data.usage || {}, model };
}
