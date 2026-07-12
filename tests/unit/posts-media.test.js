import { describe, it, expect } from 'vitest';
import {
  cleanUrls, mediaKind, validateInstagramMedia, normalizeHashtags, composeCaption,
  IG_CAROUSEL_MAX, IG_CAPTION_MAX
} from '@/lib/posts-media';

describe('cleanUrls', () => {
  it('aceita string única', () => {
    expect(cleanUrls('http://a')).toEqual(['http://a']);
  });
  it('filtra vazios e espaços', () => {
    expect(cleanUrls(['  http://a ', '', '  ', 'http://b'])).toEqual(['http://a', 'http://b']);
  });
  it('vazio p/ nulo', () => {
    expect(cleanUrls(null)).toEqual([]);
  });
});

describe('mediaKind', () => {
  it('1 imagem = image', () => expect(mediaKind(['a'])).toBe('image'));
  it('2 imagens = carousel', () => expect(mediaKind(['a', 'b'])).toBe('carousel'));
});

describe('validateInstagramMedia', () => {
  it('erro sem imagem', () => {
    expect(validateInstagramMedia([]).ok).toBe(false);
  });
  it('1 imagem ok e kind image', () => {
    const r = validateInstagramMedia(['a']);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('image');
  });
  it('carrossel no máximo ok', () => {
    const urls = Array.from({ length: IG_CAROUSEL_MAX }, (_, i) => 'u' + i);
    const r = validateInstagramMedia(urls);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('carousel');
  });
  it('erro acima do máximo', () => {
    const urls = Array.from({ length: IG_CAROUSEL_MAX + 1 }, (_, i) => 'u' + i);
    expect(validateInstagramMedia(urls).ok).toBe(false);
  });
});

describe('normalizeHashtags', () => {
  it('string com # e sem #', () => {
    expect(normalizeHashtags('#foo bar')).toEqual(['#foo', '#bar']);
  });
  it('separa por vírgula e remove duplicadas (case-insensitive)', () => {
    expect(normalizeHashtags('a, A, b')).toEqual(['#a', '#b']);
  });
  it('aceita array', () => {
    expect(normalizeHashtags(['##x', 'y'])).toEqual(['#x', '#y']);
  });
});

describe('composeCaption', () => {
  it('anexa hashtags após a legenda', () => {
    expect(composeCaption('Olá', '#a #b')).toBe('Olá\n\n#a #b');
  });
  it('sem hashtags retorna só a legenda', () => {
    expect(composeCaption('Olá', '')).toBe('Olá');
  });
  it('respeita limite de caracteres do IG', () => {
    const long = 'x'.repeat(IG_CAPTION_MAX + 500);
    expect(composeCaption(long, '').length).toBe(IG_CAPTION_MAX);
  });
});
