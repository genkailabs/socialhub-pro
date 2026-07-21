const clamp10 = (v) => Math.max(0, Math.min(10, Number(v) || 0));
const DISCLAIMER = 'Avaliação qualitativa da IA baseada nas fontes analisadas. Não são métricas oficiais do Instagram.';
const FEED_DEPENDENT = new Set(['instagram', 'design']);

export function normalizeDnaResult(content, ctx = {}) {
  let obj;
  try { obj = typeof content === 'string' ? JSON.parse(content) : content; }
  catch { throw new Error('Resposta da IA não é JSON válido.'); }
  if (!obj || typeof obj !== 'object') throw new Error('Resposta da IA vazia.');

  const dna = obj.dna || {};
  const rep = obj.report || {};
  const categories = Array.isArray(rep.categories) ? rep.categories.map((c) => {
    let confidence = ['alta', 'média', 'baixa'].includes(c.confidence) ? c.confidence : 'baixa';
    if (!ctx.hasIg && FEED_DEPENDENT.has(c.key)) confidence = 'baixa';
    return { key: String(c.key || ''), score: clamp10(c.score), confidence, basis: String(c.basis || '') };
  }) : [];

  return {
    dna,
    report: {
      disclaimer: DISCLAIMER,
      overall: clamp10(rep.overall),
      categories,
      strengths: Array.isArray(rep.strengths) ? rep.strengths.map(String) : [],
      weaknesses: Array.isArray(rep.weaknesses) ? rep.weaknesses.map(String) : [],
      opportunities: Array.isArray(rep.opportunities) ? rep.opportunities.map(String) : []
    }
  };
}
