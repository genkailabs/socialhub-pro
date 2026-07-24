import { describe, expect, it } from 'vitest';
import { buildFrameFfmpegArgs } from '@/lib/composer-media-render';

describe('capa do Reel (PRD Reels §2)', () => {
  it('extrai um frame no tempo escolhido', () => {
    const args = buildFrameFfmpegArgs({ inputPath: '/tmp/final.mp4', outputPath: '/tmp/cover.jpg', timeMs: 4200 });
    expect(args[args.indexOf('-ss') + 1]).toBe('4.2');
    expect(args[args.indexOf('-i') + 1]).toBe('/tmp/final.mp4');
    expect(args[args.indexOf('-frames:v') + 1]).toBe('1');
    expect(args.at(-1)).toBe('/tmp/cover.jpg');
  });

  it('nunca pede um tempo negativo', () => {
    const args = buildFrameFfmpegArgs({ inputPath: '/a.mp4', outputPath: '/c.jpg', timeMs: -50 });
    expect(args[args.indexOf('-ss') + 1]).toBe('0');
  });
});
