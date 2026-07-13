import 'server-only';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Cliente mínimo do DeepSeek (compatível com a API da OpenAI). Server-side.
export async function deepseekChat({ system, user, model = 'deepseek-v4-flash', temperature = 0.9, jsonMode = true }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY não configurada no servidor.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature,
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
  const content = data.choices?.[0]?.message?.content || '';
  return { content, usage: data.usage || {}, model };
}
