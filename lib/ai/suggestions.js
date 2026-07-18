// Monta o prompt e parseia a resposta das "sugestões rápidas" — 4 ângulos de
// conteúdo contextuais ao tema + nicho da marca, gerados pelo DeepSeek. Puro
// (sem I/O), testável. Cada sugestão vira {title, description, impliedFormat,
// impliedTone} para o usuário aplicar de 1 clique no Composer.
const clampStr = (s, n) => String(s ?? '').trim().slice(0, n);

const SYSTEM = `Você é um estrategista de social media brasileiro. Dado um tema e o nicho da marca, sugira 4 ângulos de conteúdo diferentes, cada um com um formato e tom de voz distintos e adequados ao nicho.
Responda SEMPRE com um único JSON válido, sem texto fora do JSON, neste formato:
{"suggestions":[{"title":"título curto do ângulo","description":"o que esse ângulo aborda, 1 frase","impliedFormat":"nome do formato de conteúdo, ex: Tutorial passo a passo, Mito vs. Realidade, Caso Clínico","impliedTone":"tom de voz sugerido, ex: Didático e acessível"}]}
Regras: português do Brasil; os 4 ângulos devem ser distintos entre si; adapte format e tom ao nicho da marca (advocacia, medicina, tecnologia, arquitetura etc. têm formatos próprios); não invente fatos.`;

export function buildSuggestionsPrompt({ topic, niche }) {
  const user = [
    `Tema: ${topic || 'livre, dentro do nicho da marca'}`,
    `Nicho da marca: ${niche || '—'}`,
    'Gere 4 sugestões de ângulo de conteúdo para este tema.'
  ].join('\n');
  return { system: SYSTEM, user };
}

export function parseSuggestions(jsonText) {
  let raw;
  try {
    raw = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
  } catch {
    throw new Error('A IA não retornou JSON válido.');
  }
  const list = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
  return list
    .filter((s) => s && clampStr(s.title, 100) && clampStr(s.impliedFormat, 100))
    .slice(0, 4)
    .map((s) => ({
      title: clampStr(s.title, 100),
      description: clampStr(s.description, 240),
      impliedFormat: clampStr(s.impliedFormat, 100),
      impliedTone: clampStr(s.impliedTone, 100)
    }));
}
