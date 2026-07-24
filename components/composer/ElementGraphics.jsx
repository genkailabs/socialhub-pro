// Desenho SVG dos elementos no canvas e na prévia. Usa a mesma geometria do
// render final (lib/composer-element-geometry) para paridade exata (§16).
// A sombra é uma duplicata deslocada sem blur — idêntica ao arquivo final.
import { arrowParts, clampRadius, lineDashArray, pointsAttribute, polygonPoints } from '@/lib/composer-element-geometry';
import { ELEMENT_ICON_MAP } from '@/data/element-icons';

const GRAPHIC_SVG_STYLE = { display: 'block', overflow: 'visible', pointerEvents: 'none' };

function box(layer) {
  return { w: Math.max(1, Number(layer.w) || 1), h: Math.max(1, Number(layer.h) || 1) };
}

export function ShapeGraphic({ layer }) {
  const { w, h } = box(layer);
  const kind = layer.shape || 'rect';
  const strokeProps = Number(layer.strokeW) > 0
    ? { stroke: layer.strokeColor || '#111111', strokeWidth: layer.strokeW }
    : {};
  const element = (extra) => {
    if (kind === 'ellipse') return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...extra} />;
    const points = polygonPoints(kind, w, h);
    if (points) return <polygon points={pointsAttribute(points)} {...extra} />;
    return <rect width={w} height={h} rx={clampRadius(layer.radius, w, h)} {...extra} />;
  };
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={GRAPHIC_SVG_STYLE} aria-hidden="true">
    {layer.shOn && <g transform={`translate(${Number(layer.shX) || 0} ${Number(layer.shY) || 0})`}>
      {element({ fill: layer.shColor || 'rgba(0,0,0,0.55)' })}
    </g>}
    {element({ fill: layer.fill === 'transparent' ? 'none' : layer.fill || '#007AFF', ...strokeProps })}
  </svg>;
}

export function LineGraphic({ layer }) {
  const { w, h } = box(layer);
  const color = layer.fill || layer.color || '#FFFFFF';
  const dash = lineDashArray(layer.dash, h);
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={GRAPHIC_SVG_STYLE} aria-hidden="true">
    <line x1={h / 2} y1={h / 2} x2={w - h / 2} y2={h / 2} stroke={color} strokeWidth={h} strokeLinecap={layer.cap === 'round' ? 'round' : 'butt'} {...(dash ? { strokeDasharray: dash } : {})} />
  </svg>;
}

export function ArrowGraphic({ layer }) {
  const { w, h } = box(layer);
  const color = layer.fill || layer.color || '#FFFFFF';
  const { body, headPolygons, stroke } = arrowParts({ w, h, heads: Number(layer.heads) || 1, curve: Boolean(layer.curve) });
  return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={GRAPHIC_SVG_STYLE} aria-hidden="true">
    {body.kind === 'path'
      ? <path d={body.d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      : <line x1={body.x1} y1={body.y1} x2={body.x2} y2={body.y2} stroke={color} strokeWidth={stroke} strokeLinecap="round" />}
    {headPolygons.map((points, index) => <polygon key={index} points={pointsAttribute(points)} fill={color} />)}
  </svg>;
}

export function IconGraphic({ layer }) {
  const icon = ELEMENT_ICON_MAP[layer.icon];
  if (!icon) return null;
  return <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ ...GRAPHIC_SVG_STYLE, color: layer.color || '#FFFFFF' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon.body }} />;
}
