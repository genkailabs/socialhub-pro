import { describe, expect, it } from 'vitest';
import { buildReelFfmpegArgs } from '@/lib/composer-media-render';

const base = {
  inputPath: '/tmp/source.mp4',
  outputPath: '/tmp/out.mp4',
  overlayPath: null,
  audioPath: null,
  canvas: [292, 519],
  output: [1080, 1920],
  transform: { x: 0, y: 0, w: 292, h: 519, scale: 1, rot: 0 }
};

function argValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

describe('args do ffmpeg para o Reel (PRD Reels §1, §5, §6)', () => {
  it('sem trim nem áudio externo mantém o comportamento atual', () => {
    const args = buildReelFfmpegArgs(base);
    expect(args).toContain('-i');
    expect(argValue(args, '-i')).toBe('/tmp/source.mp4');
    expect(args).not.toContain('-ss');
    expect(args).not.toContain('-an');
    expect(argValue(args, '-map')).toBe('[v]');
    expect(args.at(-1)).toBe('/tmp/out.mp4');
  });

  it('aplica o corte de início e fim', () => {
    const args = buildReelFfmpegArgs({ ...base, video: { start: 4.5, end: 19.5 } });
    expect(argValue(args, '-ss')).toBe('4.5');
    expect(argValue(args, '-t')).toBe('15');
  });

  it('silencia o vídeo quando pedido', () => {
    const args = buildReelFfmpegArgs({ ...base, video: { muted: true } });
    expect(args).toContain('-an');
    expect(args.join(' ')).not.toContain('volume=');
  });

  it('aplica volume do áudio original', () => {
    const args = buildReelFfmpegArgs({ ...base, video: { volume: 0.4 } });
    expect(args.join(' ')).toContain('volume=0.4');
  });

  it('usa faixa de áudio própria no lugar do original', () => {
    const args = buildReelFfmpegArgs({
      ...base,
      audioPath: '/tmp/track.mp3',
      audio: { start: 3, volume: 0.8 },
      video: { muted: true }
    });
    const inputs = args.filter((value, index) => args[index - 1] === '-i');
    expect(inputs).toEqual(['/tmp/source.mp4', '/tmp/track.mp3']);
    expect(args.join(' ')).toContain('volume=0.8');
    expect(args.join(' ')).toContain('[1:a]');
    expect(args.filter((value) => value === '-map')).toHaveLength(2);
  });

  it('mantém o overlay das camadas junto com o corte', () => {
    const args = buildReelFfmpegArgs({
      ...base,
      overlayPath: '/tmp/layers.png',
      video: { start: 2, end: 8 }
    });
    const graph = argValue(args, '-filter_complex');
    expect(graph).toContain('[1:v]overlay=0:0');
    expect(argValue(args, '-map')).toBe('[out]');
    expect(argValue(args, '-ss')).toBe('2');
  });
});
