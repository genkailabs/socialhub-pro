import { describe, expect, it } from 'vitest';
import {
  REEL_MAX_SECONDS, REEL_MIN_SECONDS, clampTrim, formatTimecode, makeReelState,
  normalizeReelState, reelClipDuration, validateReelMedia
} from '@/lib/composer-reel';

describe('estado do Reel (PRD Reels §1, §5, §7)', () => {
  it('cria o estado padrão do reel', () => {
    expect(makeReelState()).toEqual({
      video: { start: 0, end: null, volume: 1, muted: false },
      audio: null,
      cover: { mode: 'frame', timeMs: 0, url: null, path: null, name: '' }
    });
  });

  it('normaliza docs antigos (cover numérico, sem video/audio)', () => {
    const legacy = normalizeReelState({ cover: 3 });
    expect(legacy.cover).toEqual({ mode: 'frame', timeMs: 15000, url: null, path: null, name: '' });
    expect(legacy.video).toEqual({ start: 0, end: null, volume: 1, muted: false });
    expect(legacy.audio).toBeNull();
    expect(normalizeReelState(undefined).video.start).toBe(0);
  });

  it('mantém valores válidos e sanea os inválidos', () => {
    const state = normalizeReelState({
      video: { start: 2.5, end: 12, volume: 3, muted: 'sim' },
      audio: { url: 'https://x/a.mp3', path: 'temp/a.mp3', name: 'a.mp3', start: -4, volume: .5 },
      cover: { mode: 'upload', url: 'https://x/c.jpg', path: 'temp/c.jpg', name: 'c.jpg' }
    });
    expect(state.video).toEqual({ start: 2.5, end: 12, volume: 1, muted: true });
    expect(state.audio).toMatchObject({ url: 'https://x/a.mp3', start: 0, volume: .5 });
    expect(state.cover).toMatchObject({ mode: 'upload', url: 'https://x/c.jpg' });
  });

  it('limita o trim à duração e a um mínimo de 1s', () => {
    expect(clampTrim({ start: -3, end: 400 }, 30)).toEqual({ start: 0, end: 30 });
    expect(clampTrim({ start: 10, end: 10.2 }, 30)).toEqual({ start: 10, end: 11 });
    expect(clampTrim({ start: 29.8, end: 30 }, 30)).toEqual({ start: 29, end: 30 });
    expect(clampTrim({ start: 5, end: null }, 30)).toEqual({ start: 5, end: 30 });
  });

  it('calcula a duração do trecho', () => {
    expect(reelClipDuration({ start: 4, end: 19 }, 60)).toBe(15);
    expect(reelClipDuration({ start: 0, end: null }, 42)).toBe(42);
    expect(reelClipDuration(null, 0)).toBe(0);
  });

  it('formata o timecode', () => {
    expect(formatTimecode(0)).toBe('0:00');
    expect(formatTimecode(9.6)).toBe('0:09');
    expect(formatTimecode(75)).toBe('1:15');
  });

  it('valida duração, formato e resolução da fonte', () => {
    expect(REEL_MIN_SECONDS).toBe(3);
    expect(REEL_MAX_SECONDS).toBe(90);

    const ok = validateReelMedia({
      media: { kind: 'video', duration: 30, width: 1080, height: 1920, type: 'video/mp4' },
      video: { start: 0, end: 20 }
    });
    expect(ok).toEqual({ ok: true, errors: [], warnings: [] });

    expect(validateReelMedia({ media: null, video: {} }).errors).toEqual(['Adicione um vídeo para o Reel.']);

    const curto = validateReelMedia({
      media: { kind: 'video', duration: 30, width: 1080, height: 1920, type: 'video/mp4' },
      video: { start: 0, end: 2 }
    });
    expect(curto.ok).toBe(false);
    expect(curto.errors[0]).toContain('3 segundos');

    const longo = validateReelMedia({
      media: { kind: 'video', duration: 200, width: 1080, height: 1920, type: 'video/mp4' },
      video: { start: 0, end: 120 }
    });
    expect(longo.errors[0]).toContain('90 segundos');

    const imagem = validateReelMedia({
      media: { kind: 'image', duration: 0, width: 1080, height: 1920, type: 'image/png' },
      video: {}
    });
    expect(imagem.errors[0]).toContain('MP4 ou MOV');

    const pequeno = validateReelMedia({
      media: { kind: 'video', duration: 20, width: 320, height: 568, type: 'video/mp4' },
      video: { start: 0, end: 20 }
    });
    expect(pequeno.ok).toBe(true);
    expect(pequeno.warnings[0]).toContain('resolução');
  });
});
