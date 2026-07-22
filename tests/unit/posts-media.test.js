import { describe, it, expect } from 'vitest';
import {
  cleanUrls, mediaKind, validateInstagramMedia, normalizeHashtags, composeCaption,
  IG_CAROUSEL_MAX, IG_CAPTION_MAX, isTempMediaPath, uploadTempMedia, calculateDeleteAfter
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

describe('isTempMediaPath', () => {
  it('retorna true para path começando com temp/', () => {
    expect(isTempMediaPath('temp/brand/123.jpg')).toBe(true);
  });
  it('retorna true para URL pública contendo /temp/', () => {
    expect(isTempMediaPath('https://supa.com/storage/v1/object/public/media/temp/brand/123.jpg')).toBe(true);
  });
  it('retorna false para caminhos permanentes', () => {
    expect(isTempMediaPath('brand/123.jpg')).toBe(false);
    expect(isTempMediaPath('https://supa.com/storage/v1/object/public/media/brand/123.jpg')).toBe(false);
  });
});

describe('uploadTempMedia', () => {
  it('faz upload e retorna path e publicUrl', async () => {
    const mockSupabase = {
      storage: {
        from: () => ({
          upload: async (path) => ({ error: null }),
          getPublicUrl: (path) => ({ data: { publicUrl: `https://mock.url/${path}` } })
        })
      }
    };
    const res = await uploadTempMedia(mockSupabase, 'brand1', { name: 'test.mp4', type: 'video/mp4' });
    expect(res.path).toMatch(/^temp\/brand1\//);
    expect(res.path).toMatch(/\.mp4$/);
    expect(res.publicUrl).toBe(`https://mock.url/${res.path}`);
  });
  it('lança erro em caso de falha no supabase', async () => {
    const mockSupabase = {
      storage: {
        from: () => ({
          upload: async () => ({ error: { message: 'storage error' } })
        })
      }
    };
    await expect(uploadTempMedia(mockSupabase, 'brand1', { name: 't.jpg' })).rejects.toThrow('Falha no upload temporário: storage error');
  });
});

describe('calculateDeleteAfter', () => {
  it('retorna +30 dias de updatedAt para rascunhos e aprovações', () => {
    const base = new Date('2026-07-01T12:00:00Z').getTime();
    const expected = new Date(base + 30 * 24 * 3600 * 1000).toISOString();
    expect(calculateDeleteAfter('draft', null, '2026-07-01T12:00:00Z')).toBe(expected);
    expect(calculateDeleteAfter('awaiting_approval', null, '2026-07-01T12:00:00Z')).toBe(expected);
    expect(calculateDeleteAfter('waiting_approval', null, '2026-07-01T12:00:00Z')).toBe(expected);
    expect(calculateDeleteAfter('ready_to_post', null, '2026-07-01T12:00:00Z')).toBe(expected);
  });

  it('retorna null para agendados ou status desconhecido', () => {
    expect(calculateDeleteAfter('scheduled')).toBeNull();
    expect(calculateDeleteAfter('unknown_status')).toBeNull();
  });

  it('retorna +24h de publishedAt para publicados ou posted_manually', () => {
    const base = new Date('2026-07-10T15:00:00Z').getTime();
    const expected = new Date(base + 24 * 3600 * 1000).toISOString();
    expect(calculateDeleteAfter('published', '2026-07-10T15:00:00Z', null)).toBe(expected);
    expect(calculateDeleteAfter('posted_manually', '2026-07-10T15:00:00Z', null)).toBe(expected);
  });

  it('retorna +7 dias de updatedAt para failed e error', () => {
    const base = new Date('2026-07-15T10:00:00Z').getTime();
    const expected = new Date(base + 7 * 24 * 3600 * 1000).toISOString();
    expect(calculateDeleteAfter('failed', null, '2026-07-15T10:00:00Z')).toBe(expected);
    expect(calculateDeleteAfter('error', null, '2026-07-15T10:00:00Z')).toBe(expected);
  });

  it('retorna +1 hora para cancelled', () => {
    const base = new Date('2026-07-20T08:00:00Z').getTime();
    const expected = new Date(base + 3600 * 1000).toISOString();
    expect(calculateDeleteAfter('cancelled', null, '2026-07-20T08:00:00Z')).toBe(expected);
  });
});

