import { describe, it, expect } from 'vitest';
import { dominantHexFromPixels } from '@/lib/color/dominant';

describe('dominantHexFromPixels', () => {
  it('acha a cor mais frequente (ignora quase-transparente)', () => {
    // RGBA planos: 2 px vermelhos opacos, 1 azul opaco, 1 transparente
    const px = new Uint8ClampedArray([255,0,0,255, 255,0,0,255, 0,0,255,255, 0,0,0,0]);
    expect(dominantHexFromPixels(px, 1)).toBe('#f00000');
  });
});
