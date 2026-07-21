// Quantas artes a spec do AI Studio gera (carrossel = capa + dicas).
//
// O renderizador antigo (`renderNode`, templates fixos com padding de 96px)
// morreu aqui: quem desenha a arte agora é lib/ai/art — layouts de verdade,
// escala proporcional e controle de qualidade antes de entregar.
export function slideCount(spec = {}) {
  if (spec.template === 'tips_carousel') {
    const tips = Array.isArray(spec.bullets) ? spec.bullets.length : 0;
    return Math.max(2, Math.min(10, tips + 1));
  }
  return 1;
}
