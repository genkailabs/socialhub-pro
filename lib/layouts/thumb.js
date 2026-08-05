/**
 * Blocos da miniatura de um layout salvo, em porcentagem do canvas.
 *
 * A miniatura é desenhada a partir das próprias camadas — posição, tamanho e
 * peso do texto —, e não de um placeholder genérico: dois layouts salvos com o
 * mesmo placeholder ficariam idênticos na grade, que é justamente o problema
 * que a Biblioteca resolve.
 *
 * Vivia dentro de LayoutLibrary.jsx; saiu para cá quando a Biblioteca virou
 * rota e passou a precisar do mesmo desenho fora do modal.
 */
export function templateBlocks(template) {
  const [canvasW, canvasH] = template?.canvas || [430, 430];
  if (!canvasW || !canvasH) return [];

  const blocks = [];
  if (template?.media) blocks.push({ key: 'media', x: 0, y: 0, w: 100, h: 100, tone: 'media' });

  for (const element of template?.elements || []) {
    const layer = element.layer || {};
    blocks.push({
      key: element.id,
      x: (layer.x / canvasW) * 100,
      y: (layer.y / canvasH) * 100,
      w: (layer.w / canvasW) * 100,
      // Piso de 1.6%: linha de texto fina some na miniatura e o layout parece
      // ter menos camadas do que tem.
      h: Math.max((layer.h / canvasH) * 100, 1.6),
      tone: layer.type === 'text' && (layer.fs || 0) >= 24 ? 'strong' : layer.type === 'text' ? 'soft' : 'accent'
    });
  }

  return blocks;
}
