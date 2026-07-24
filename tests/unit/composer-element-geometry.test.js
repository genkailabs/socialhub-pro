import { describe, expect, it } from 'vitest';
import {
  SHAPE_KINDS, arrowParts, lineDashArray, pointsAttribute, polygonPoints
} from '@/lib/composer-element-geometry';

describe('geometria dos elementos (PRD Elementos §5-§7)', () => {
  it('expõe os cinco traçados de forma', () => {
    expect(SHAPE_KINDS).toEqual(['rect', 'ellipse', 'triangle', 'star', 'hexagon']);
  });

  it('gera polígonos dentro da caixa w×h', () => {
    expect(polygonPoints('triangle', 100, 80)).toEqual([[50, 0], [100, 80], [0, 80]]);
    expect(polygonPoints('hexagon', 100, 80)).toEqual([
      [25, 0], [75, 0], [100, 40], [75, 80], [25, 80], [0, 40]
    ]);
    const star = polygonPoints('star', 100, 100);
    expect(star).toHaveLength(10);
    expect(star[0][0]).toBeCloseTo(50);
    expect(star[0][1]).toBeCloseTo(0);
    for (const [x, y] of star) {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(100.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(100.01);
    }
    expect(polygonPoints('rect', 100, 80)).toBeNull();
    expect(polygonPoints('ellipse', 100, 80)).toBeNull();
  });

  it('serializa pontos com offset', () => {
    expect(pointsAttribute([[1.005, 2], [3, 4]], 10, 20)).toBe('11.01,22 13,24');
  });

  it('calcula tracejado em função da espessura', () => {
    expect(lineDashArray('solid', 4)).toBeNull();
    expect(lineDashArray('dashed', 4)).toBe('10 6.4');
    expect(lineDashArray('dotted', 4)).toBe('0.1 7.6');
  });

  it('monta seta simples, dupla e curva', () => {
    const simple = arrowParts({ w: 160, h: 36 });
    expect(simple.body.kind).toBe('line');
    expect(simple.body.x1).toBe(0);
    expect(simple.headPolygons).toHaveLength(1);
    expect(simple.stroke).toBeGreaterThan(0);

    const double = arrowParts({ w: 160, h: 36, heads: 2 });
    expect(double.headPolygons).toHaveLength(2);
    expect(double.body.x1).toBeGreaterThan(0);

    const curved = arrowParts({ w: 150, h: 60, curve: true });
    expect(curved.body.kind).toBe('path');
    expect(curved.body.d).toMatch(/^M .* Q /);
    expect(curved.headPolygons).toHaveLength(1);
  });
});
