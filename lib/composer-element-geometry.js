// Geometria pura dos elementos (formas, linhas e setas), compartilhada entre o
// canvas (React) e o render final (SVG do sharp/librsvg), para que as duas
// superfícies desenhem exatamente o mesmo traçado (PRD Elementos §16).

const round = (value) => Math.round(value * 100) / 100;

export const SHAPE_KINDS = ['rect', 'ellipse', 'triangle', 'star', 'hexagon'];

// Pontos do polígono dentro da caixa w×h (origem 0,0). rect/ellipse não usam
// polígono e retornam null.
export function polygonPoints(kind, w, h) {
  if (kind === 'triangle') return [[w / 2, 0], [w, h], [0, h]];
  if (kind === 'hexagon') {
    return [[w * .25, 0], [w * .75, 0], [w, h / 2], [w * .75, h], [w * .25, h], [0, h / 2]];
  }
  if (kind === 'star') {
    const points = [];
    for (let index = 0; index < 10; index++) {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const factor = index % 2 === 0 ? 1 : .42;
      points.push([
        w / 2 + Math.cos(angle) * (w / 2) * factor,
        h / 2 + Math.sin(angle) * (h / 2) * factor
      ]);
    }
    return points;
  }
  return null;
}

export function pointsAttribute(points, offsetX = 0, offsetY = 0) {
  return points.map(([x, y]) => `${round(x + offsetX)},${round(y + offsetY)}`).join(' ');
}

// Tracejado de linhas (§7) proporcional à espessura (h da camada). Pontilhada
// usa segmento ~0 + linecap redondo, que vira um ponto circular.
export function lineDashArray(dash, thickness) {
  if (dash === 'dashed') return `${round(thickness * 2.5)} ${round(thickness * 1.6)}`;
  if (dash === 'dotted') return `0.1 ${round(thickness * 1.9)}`;
  return null;
}

// Peças da seta (§7): corpo (linha reta ou curva quadrática) + cabeças.
// heads = 1 (simples) ou 2 (dupla); curve desenha o corpo em arco.
export function arrowParts({ w, h, heads = 1, curve = false }) {
  const stroke = Math.max(2, Math.min(h * .3, w * .12));
  const head = Math.min(w * .35, h);
  const midY = h / 2;
  const startX = heads === 2 ? head * .7 : 0;
  const endX = w - head * .7;
  const body = curve
    ? { kind: 'path', d: `M ${round(startX)} ${round(h * .9)} Q ${round(w / 2)} ${round(-h * .4)} ${round(endX)} ${round(midY)}` }
    : { kind: 'line', x1: round(startX), y1: round(midY), x2: round(endX), y2: round(midY) };
  const headPolygons = [[[w, midY], [w - head, 0], [w - head, h]]];
  if (heads === 2) headPolygons.push([[0, midY], [head, 0], [head, h]]);
  return { body, headPolygons, stroke: round(stroke) };
}
