// Seleciona as legendas mais "relevantes" (não vazias, mais informativas) e limita a N.
// Heurística simples: pontua por comprimento e presença de sinais (CTA, hashtag, emoji).
export function pickRelevantCaptions(media = [], n = 12) {
  const score = (c) => {
    const t = String(c || '').trim();
    if (!t) return -1;
    // comprimento domina (proxy de densidade informativa); sinais de CTA/hashtag
    // entram só como leve desempate p/ não deixar promo curta vencer legenda rica.
    let s = Math.min(t.length, 500);
    if (/#\w+/.test(t)) s += 5;
    if (/(link na bio|clique|acesse|compre|saiba mais|garanta|aproveite)/i.test(t)) s += 10;
    return s;
  };
  return media
    .map((m) => (typeof m === 'string' ? m : m?.caption))
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, Math.max(0, n))
    .map((x) => x.c);
}
