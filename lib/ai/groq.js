import 'server-only';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_TIMEOUT_MS = 45_000;

// Modelo padrão do fallback. Vive em env de propósito: o catálogo do Groq muda
// mais rápido do que este repositório, e trocar de modelo não pode exigir
// deploy. O único requisito real é aceitar `response_format: json_object` —
// sem isso o modelo devolve o objeto embrulhado em Markdown e a skill rejeita.
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

// Cliente mínimo do Groq (API compatível com a da OpenAI). Server-side.
// Existe como plano B do DeepSeek: quando o principal dá timeout, erro ou volta
// vazio, a geração morria inteira. Ver lib/ai/provider/index.js.
export async function groqChat({
  system,
  user,
  model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
  temperature = 0.9,
  jsonMode = true,
  maxTokens = 1200,
  timeoutMs = GROQ_TIMEOUT_MS
}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY não configurada no servidor.');

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
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
      throw new Error('Groq: a geração excedeu o tempo limite.');
    }
    throw error;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Groq: ${data.error?.message || res.statusText || 'falha na chamada'}`);
  }
  const choice = data.choices?.[0] || {};
  // Mesmo contrato do DeepSeek: 'length' (corte no teto) e saída inválida pedem
  // reações opostas, e quem chama precisa distinguir as duas.
  return {
    content: choice.message?.content || '',
    usage: data.usage || {},
    model,
    finishReason: choice.finish_reason || null
  };
}
