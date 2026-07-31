import 'server-only';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
export const DEEPSEEK_TIMEOUT_MS = 45_000;

// Cliente mínimo do DeepSeek (compatível com a API da OpenAI). Server-side.
// `thinking` vem DESLIGADO por padrão, e isso é a diferença entre gerar e falhar.
//
// A família v4 raciocina por padrão ("the thinking toggle defaults to enabled") e o
// raciocínio consome o MESMO orçamento de `max_tokens` que a resposta. Medido no
// prompt real de post: 1318 tokens de raciocínio + 282 de conteúdo = os 1600 do teto,
// resposta cortada no meio e `finish_reason: length` — que a interface mostrava como
// "A IA não retornou JSON válido".
//
// Aqui não se quer cadeia de pensamento: quer-se um objeto que obedece a um schema.
// Quem precisar de raciocínio um dia pede explicitamente.
export async function deepseekChat({
  system,
  user,
  model = 'deepseek-v4-flash',
  temperature = 0.9,
  jsonMode = true,
  maxTokens = 1200,
  thinking = false,
  timeoutMs = DEEPSEEK_TIMEOUT_MS
}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY não configurada no servidor.');

  // A API oficial aposentou o alias deepseek-chat em 2026-07-24 e agora só aceita
  // deepseek-v4-flash / deepseek-v4-pro. O mapeamento vale no sentido inverso:
  // chamadas legadas que ainda pedem deepseek-chat sobem como flash.
  const apiModel = model === 'deepseek-chat' ? 'deepseek-v4-flash' : model;

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: apiModel,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        thinking: { type: thinking ? 'enabled' : 'disabled' }
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw new Error('DeepSeek: a geração excedeu o tempo limite.');
    }
    throw error;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`DeepSeek: ${data.error?.message || res.statusText || 'falha na chamada'}`);
  }
  const choice = data.choices?.[0] || {};
  // finish_reason sobe junto porque "length" (resposta cortada no teto) e
  // "resposta invalida" pedem reacoes opostas: uma se resolve com mais espaco,
  // a outra com outro pedido. Sem ele, quem chama so ve um JSON quebrado.
  return {
    content: choice.message?.content || '',
    usage: data.usage || {},
    model,
    finishReason: choice.finish_reason || null
  };
}
