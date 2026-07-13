import 'server-only';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export function hasGeminiKey() {
  const k = process.env.GEMINI_API_KEY;
  return typeof k === 'string' && k.trim().length > 0;
}

// Gera 1 imagem a partir de prompt e devolve { bytes, contentType, model }.
export async function geminiGenerateImage({ prompt, model = GEMINI_IMAGE_MODEL }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não configurada no servidor.');
  if (!prompt || !String(prompt).trim()) throw new Error('Gemini: prompt de imagem vazio.');

  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: String(prompt) }] }],
      generationConfig: { responseModalities: ['IMAGE'] }
    }),
    cache: 'no-store'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Gemini imagem: ${data.error?.message || res.statusText || 'falha'}`);

  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error('Gemini imagem: resposta sem imagem.');
  return {
    bytes: Buffer.from(img.inlineData.data, 'base64'),
    contentType: img.inlineData.mimeType || 'image/png',
    model
  };
}
