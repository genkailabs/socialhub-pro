import { describe, expect, it } from 'vitest';
import { resolveArtPalette, ensureReadableInk, NEUTRAL_PALETTE, ART_SIZES, resolveSize } from '@/lib/ai/art/palette';
import { contrastRatio, MIN_CONTRAST_BODY } from '@/lib/ai/art/quality';

describe('resolveArtPalette (§18)', () => {
  it('usa a cor real da marca como acento', () => {
    const p = resolveArtPalette({ kit: { palette: { accent: '#E4572E' } }, niche: 'restaurante' });
    expect(p.accent).toBe('#E4572E');
    expect(p.followsBrandKit).toBe(true);
  });

  it('cai na cor do nicho quando o Brand DNA nao tem cor', () => {
    const p = resolveArtPalette({ niche: 'advocacia' });
    expect(p.accent).toBe('#C8A24A');
    expect(p.niche).toBe('advocacia');
    expect(p.followsBrandKit).toBe(false);
  });

  it('nao usa mais o azul iOS antigo', () => {
    expect(JSON.stringify(resolveArtPalette({}))).not.toContain('007AFF');
    expect(NEUTRAL_PALETTE.accent).not.toBe('#007AFF');
  });

  it('garante contraste legivel entre texto e fundo', () => {
    const p = resolveArtPalette({ kit: { palette: { bg: '#FFFFFF', ink: '#EEEEEE' } } });
    expect(contrastRatio(p.ink, p.bg)).toBeGreaterThanOrEqual(MIN_CONTRAST_BODY);
  });

  it('escolhe o texto sobre o acento pelo contraste, sem chutar', () => {
    expect(resolveArtPalette({ kit: { palette: { accent: '#111111' } } }).onAccent).toBe('#FFFFFF');
    expect(resolveArtPalette({ kit: { palette: { accent: '#FFEE00' } } }).onAccent).toBe('#111111');
  });

  it('ignora cor invalida em vez de gravar lixo', () => {
    const p = resolveArtPalette({ kit: { palette: { accent: 'azul' } }, brandColor: 'nope' });
    expect(p.followsBrandKit).toBe(false);
    expect(p.accent).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('ensureReadableInk', () => {
  it('escurece texto claro sobre fundo claro', () => {
    const ink = ensureReadableInk('#DDDDDD', '#FFFFFF');
    expect(contrastRatio(ink, '#FFFFFF')).toBeGreaterThanOrEqual(MIN_CONTRAST_BODY);
  });
  it('clareia texto escuro sobre fundo escuro', () => {
    const ink = ensureReadableInk('#222222', '#111111');
    expect(contrastRatio(ink, '#111111')).toBeGreaterThanOrEqual(MIN_CONTRAST_BODY);
  });
  it('mantem o que ja passa', () => {
    expect(ensureReadableInk('#000000', '#FFFFFF')).toBe('#000000');
  });
});

describe('tamanhos', () => {
  it('feed e story dividem o mesmo lado menor', () => {
    expect(Math.min(ART_SIZES.square.width, ART_SIZES.square.height))
      .toBe(Math.min(ART_SIZES.story.width, ART_SIZES.story.height));
  });
  it('story e 1080x1920', () => {
    expect(resolveSize('story')).toMatchObject({ width: 1080, height: 1920 });
    expect(resolveSize('desconhecido')).toMatchObject({ width: 1080, height: 1080 });
  });
});
