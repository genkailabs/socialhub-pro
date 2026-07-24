import { fontFamilyCss, resolveFontWeight } from './composer-fonts';

// Estilo CSS compartilhado entre o canvas de edição e a prévia do Instagram,
// para que as duas superfícies exibam exatamente a mesma camada (PRD §16).

const TEXT_TYPES = new Set(['text', 'button', 'sticker']);

export function isTextLayer(layer) {
  return TEXT_TYPES.has(layer?.type);
}

export function layerBoxStyle(layer) {
  const textLike = layer.type === 'text' || layer.type === 'sticker';
  const boxBackground = layer.bgMode === 'box' && layer.type === 'text';
  const style = {
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    fontSize: layer.fs,
    fontWeight: resolveFontWeight(layer.font, layer.weight),
    fontStyle: layer.italic ? 'italic' : 'normal',
    textAlign: layer.align,
    justifyContent: layer.align === 'left' ? 'flex-start' : layer.align === 'right' ? 'flex-end' : 'center',
    fontFamily: fontFamilyCss(layer.font),
    color: layer.color,
    background: boxBackground ? layer.bgFill : textLike ? 'transparent' : layer.fill,
    borderRadius: boxBackground ? (layer.bgRadius ?? 8) : layer.radius,
    opacity: layer.op,
    transform: `rotate(${layer.rot}deg)`,
    letterSpacing: layer.ls ? `${layer.ls}px` : undefined,
    lineHeight: layer.lh || 1.05
  };
  if (isTextLayer(layer)) {
    if (Number(layer.strokeW) > 0) {
      style.WebkitTextStroke = `${layer.strokeW}px ${layer.strokeColor || '#111111'}`;
    }
    if (layer.shOn) {
      style.textShadow = `${layer.shX ?? 0}px ${layer.shY ?? 3}px ${layer.shB ?? 8}px ${layer.shColor || 'rgba(0,0,0,0.55)'}`;
    }
  }
  return style;
}

// Estilo do span interno usado no modo "fundo por linha" (§9).
export function layerLineBgStyle(layer) {
  if (layer.bgMode !== 'line' || layer.type !== 'text') return null;
  return {
    background: layer.bgFill,
    borderRadius: layer.bgRadius ?? 8,
    padding: '0.08em 0.35em',
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone'
  };
}
