import 'server-only';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Cliente mínimo do DeepSeek (compatível com a API da OpenAI). Server-side.
export async function deepseekChat({ system, user, model = 'deepseek-v4-flash', temperature = 0.9, jsonMode = true, maxTokens = 1200 }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY não configurada no servidor.');

  const res = await fetch(API_URL, {
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
    cache: 'no-store'
  });

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
