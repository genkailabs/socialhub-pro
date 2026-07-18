import 'server-only';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Cliente mínimo do Gemini (texto). Server-side. Retorna no MESMO formato do
// deepseekChat: { content, usage:{prompt_tokens, completion_tokens}, model }.
export async function geminiChat({ system, user, model = 'gemini-flash-latest', temperature = 0.9, jsonMode = true }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não configurada no servidor.');

  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {})
      }
    }),
    cache: 'no-store'
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Gemini: ${data.error?.message || res.statusText || 'falha na chamada'}`);
  }
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  const um = data.usageMetadata || {};
  return {
    content,
    usage: { prompt_tokens: um.promptTokenCount || 0, completion_tokens: um.candidatesTokenCount || 0 },
    model
  };
}
