import { describe, expect, it } from 'vitest';
import { buildComposerLayersSvg } from '@/lib/composer-media-render';

const base = { x: 10, y: 20, w: 100, h: 80, rot: 0, op: 1, hidden: false };

describe('render final dos elementos (PRD Elementos §16)', () => {
  it('renderiza elipse, triângulo, estrela e hexágono', () => {
    expect(buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'ellipse', fill: '#FF9500' }])).toContain('<ellipse');
    expect(buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'triangle', fill: '#34C759' }])).toContain('<polygon points="50,0 100,80 0,80"');
    const star = buildComposerLayersSvg([{ ...base, h: 100, type: 'shape', shape: 'star', fill: '#FFD60A' }]);
    expect(star).toContain('<polygon');
    expect(buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'hexagon', fill: '#FF375F' }])).toContain('<polygon points="25,0 75,0 100,40 75,80 25,80 0,40"');
  });

  it('renderiza retângulo com borda e sombra deslocada', () => {
    const svg = buildComposerLayersSvg([{ ...base, type: 'shape', shape: 'rect', radius: 16, fill: '#007AFF', strokeW: 2, strokeColor: '#111111', shOn: true, shX: 3, shY: 5, shColor: 'rgba(0,0,0,0.5)' }]);
    expect(svg).toContain('rx="16"');
    expect(svg).toContain('stroke="#111111" stroke-width="2"');
    expect(svg).toContain('translate(3 5)');
    expect(svg).toContain('rgba(0,0,0,0.5)');
  });

  it('renderiza linha tracejada e pontilhada com linecap', () => {
    const dashed = buildComposerLayersSvg([{ ...base, h: 4, type: 'line', dash: 'dashed', cap: 'butt', fill: '#FFFFFF' }]);
    expect(dashed).toContain('stroke-dasharray="10 6.4"');
    expect(dashed).toContain('stroke-linecap="butt"');
    const dotted = buildComposerLayersSvg([{ ...base, h: 4, type: 'line', dash: 'dotted', cap: 'round', fill: '#FFFFFF' }]);
    expect(dotted).toContain('stroke-dasharray="0.1 7.6"');
    expect(dotted).toContain('stroke-linecap="round"');
  });

  it('renderiza seta simples, dupla e curva', () => {
    const single = buildComposerLayersSvg([{ ...base, h: 36, type: 'arrow', fill: '#FFFFFF' }]);
    expect(single.match(/<polygon/g)).toHaveLength(1);
    const double = buildComposerLayersSvg([{ ...base, h: 36, type: 'arrow', heads: 2, fill: '#FFFFFF' }]);
    expect(double.match(/<polygon/g)).toHaveLength(2);
    const curved = buildComposerLayersSvg([{ ...base, h: 60, type: 'arrow', curve: true, fill: '#FFFFFF' }]);
    expect(curved).toContain('<path d="M ');
  });

  it('renderiza ícone vetorial com escala e cor da camada', () => {
    const svg = buildComposerLayersSvg([{ ...base, w: 64, h: 64, type: 'icon', icon: 'coracao', color: '#FF375F' }]);
    expect(svg).toContain('translate(10 20) scale(');
    expect(svg).toContain('#FF375F');
    expect(svg).not.toContain('currentColor');
  });

  it('ignora ícone desconhecido sem quebrar', () => {
    expect(() => buildComposerLayersSvg([{ ...base, type: 'icon', icon: 'nao-existe', color: '#FFF' }])).not.toThrow();
  });
});
