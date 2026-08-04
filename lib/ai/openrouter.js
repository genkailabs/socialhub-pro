import 'server-only';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';
export const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 15_000;
// OpenRouter usa estes dois para identificar o app no ranking deles — não
// afeta a resposta, só a atribuição do lado deles.
const SITE_URL = 'https://socialhub-mvp-production.up.railway.app';
const SITE_TITLE = 'Social Hub';

// Cliente mínimo do OpenRouter (compatível com a API da OpenAI). Server-side.
// Único provedor de texto do produto: sem plano B para DeepSeek/Groq (decisão
// de 2026-08-04 — Groq tinha teto de 8000 tokens/min na conta, e a alternativa
// anterior, DeepSeek, saiu por decisão do dono).
export async function openrouterChat({
  system,
  user,
  model = process.env.OPENROUTER_TEXT_MODEL || DEFAULT_OPENROUTER_MODEL,
  temperature = 0.9,
  jsonMode = true,
  maxTokens = 1200,
  timeoutMs = OPENROUTER_TIMEOUT_MS
}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada no servidor.');

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_TITLE
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw new Error('OpenRouter: a geração excedeu o tempo limite.');
    }
    throw error;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error?.message || res.statusText || '';
    // Mensagem por status: quem lê o log em generation_jobs precisa saber se o
    // problema é credencial, saldo, limite de taxa ou o serviço fora do ar —
    // cada um pede uma reação diferente de quem opera o produto.
    if (res.status === 401) throw new Error(`OpenRouter: chave de API inválida ou não autorizada. ${msg}`.trim());
    if (res.status === 402) throw new Error(`OpenRouter: saldo insuficiente na conta OpenRouter. ${msg}`.trim());
    if (res.status === 429) throw new Error(`OpenRouter: limite de requisições atingido. ${msg || 'Tente novamente em instantes.'}`);
    if (res.status >= 500) throw new Error(`OpenRouter: serviço indisponível (${res.status}). ${msg}`.trim());
    throw new Error(`OpenRouter: ${msg || 'falha na chamada'}`);
  }

  const choice = data.choices?.[0] || {};
  return {
    content: choice.message?.content || '',
    usage: data.usage || {},
    model,
    finishReason: choice.finish_reason || null
  };
}
