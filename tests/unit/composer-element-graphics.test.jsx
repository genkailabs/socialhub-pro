import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ArrowGraphic, IconGraphic, LineGraphic, ShapeGraphic } from '@/components/composer/ElementGraphics';
import { GRAPHIC_TYPES, layerBoxStyle } from '@/lib/composer-layer-style';

beforeAll(() => {
  vi.stubGlobal('React', React);
});

afterEach(cleanup);

describe('gráficos dos elementos no canvas (PRD Elementos §5-§9)', () => {
  it('desenha estrela com borda e sombra', () => {
    const { container } = render(<ShapeGraphic layer={{ type: 'shape', shape: 'star', w: 100, h: 100, fill: '#FFD60A', strokeW: 2, strokeColor: '#111111', shOn: true, shX: 2, shY: 4, shColor: 'rgba(0,0,0,0.5)' }} />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons).toHaveLength(2);
    expect(polygons[1].getAttribute('stroke')).toBe('#111111');
    expect(container.querySelector('g')?.getAttribute('transform')).toBe('translate(2 4)');
  });

  it('desenha elipse e retângulo arredondado', () => {
    const ellipse = render(<ShapeGraphic layer={{ type: 'shape', shape: 'ellipse', w: 120, h: 80, fill: '#FF9500' }} />);
    expect(ellipse.container.querySelector('ellipse')).toBeTruthy();
    cleanup();
    const rect = render(<ShapeGraphic layer={{ type: 'shape', shape: 'rect', w: 120, h: 80, radius: 16, fill: '#007AFF' }} />);
    expect(rect.container.querySelector('rect')?.getAttribute('rx')).toBe('16');
  });

  it('desenha linha tracejada com a espessura da camada', () => {
    const { container } = render(<LineGraphic layer={{ type: 'line', w: 180, h: 4, dash: 'dashed', cap: 'butt', fill: '#FFFFFF' }} />);
    const line = container.querySelector('line');
    expect(line?.getAttribute('stroke-width')).toBe('4');
    expect(line?.getAttribute('stroke-dasharray')).toBe('10 6.4');
  });

  it('desenha seta dupla e seta curva', () => {
    const double = render(<ArrowGraphic layer={{ type: 'arrow', w: 160, h: 36, heads: 2, fill: '#FFFFFF' }} />);
    expect(double.container.querySelectorAll('polygon')).toHaveLength(2);
    cleanup();
    const curved = render(<ArrowGraphic layer={{ type: 'arrow', w: 150, h: 60, curve: true, fill: '#FFFFFF' }} />);
    expect(curved.container.querySelector('path')?.getAttribute('d')).toMatch(/Q/);
  });

  it('desenha ícone vetorial com a cor da camada', () => {
    const { container } = render(<IconGraphic layer={{ type: 'icon', icon: 'coracao', w: 64, h: 64, color: '#FF375F' }} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.style.color).toBe('rgb(255, 55, 95)');
    expect(svg?.innerHTML).toContain('currentColor');
  });

  it('camadas gráficas não pintam fundo CSS', () => {
    expect(GRAPHIC_TYPES.has('shape')).toBe(true);
    const style = layerBoxStyle({ type: 'shape', shape: 'star', x: 0, y: 0, w: 100, h: 100, fill: '#FFD60A', op: 1, rot: 0, align: 'center' });
    expect(style.background).toBe('transparent');
  });
});
