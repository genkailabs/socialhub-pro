// Extração de JSON da resposta de um modelo — uma implementação só.
//
// Existiam três, com resiliências diferentes: o Composer reparava aspas curvas
// e vírgula sobrando, as skills só isolavam o objeto, e o Brand DNA só tirava a
// cerca de markdown. A mais fraca era a que quebrou em produção
// ("Resposta da IA não é JSON válido" com a resposta inteira na mão). Três
// comportamentos para o mesmo problema é o problema.

/**
 * Devolve o objeto JSON contido na resposta do modelo.
 * Lança se não houver nada aproveitável.
 */
export function jsonFromModelOutput(content) {
  if (content && typeof content === 'object') return content;

  const text = String(content ?? '').trim();
  if (!text) throw new Error('resposta vazia');

  // 1. bloco cercado por ``` tem prioridade sobre o resto do texto
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced?.[1] || text).trim();

  try { return JSON.parse(candidate); } catch { /* segue para o reparo */ }

  // 2. defeitos que os modelos repetem: aspas tipográficas e vírgula sobrando
  const repaired = candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');

  try { return JSON.parse(repaired); } catch { /* segue para o recorte */ }

  // 3. frase solta antes ou depois do objeto: recorta do primeiro { ao último }
  const start = repaired.indexOf('{');
  const end = repaired.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(repaired.slice(start, end + 1));

  throw new Error('resposta nao era JSON');
}
