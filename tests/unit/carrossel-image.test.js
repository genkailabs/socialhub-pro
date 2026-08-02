import { beforeEach, describe, expect, it, vi } from 'vitest';

const cleanupMocks = vi.hoisted(() => ({ cleanOrphanedTempMedia: vi.fn() }));
vi.mock('@/lib/media-cleanup', () => ({ cleanOrphanedTempMedia: cleanupMocks.cleanOrphanedTempMedia }));

import {
  CAROUSEL_IMAGE_LIFECYCLE,
  CarouselImageError,
  buildCarouselImagePrompt,
  cleanExpiredCarouselImages,
  generateCarouselImage,
  validateCarouselImageInput
} from '@/lib/carrossel-image';

const BRAND_ID = '123e4567-e89b-42d3-a456-426614174000';

function validInput(overrides = {}) {
  return {
    brandId: BRAND_ID,
    slide: { headline: 'Pare de perder clientes', body: 'Três sinais de uma comunicação confusa.' },
    style: 'editorial minimalista',
    aspectRatio: '4:5',
    ...overrides
  };
}

function query(result) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result)
  };
  return builder;
}

function supabaseMock({ brand = { id: BRAND_ID, name: 'Acme', category: 'consultoria' }, uploadError = null } = {}) {
  const brandQuery = query({ data: brand, error: null });
  const kitQuery = query({ data: { audience: 'PMEs', tone: 'direto', visual_style: 'clean', palette: { primary: '#112233' } }, error: null });
  const storage = {
    upload: vi.fn().mockResolvedValue({ error: uploadError }),
    getPublicUrl: vi.fn((path) => ({ data: { publicUrl: `https://cdn.example/${path}` } }))
  };
  return {
    client: {
      from: vi.fn((table) => table === 'brands' ? brandQuery : kitQuery),
      storage: { from: vi.fn().mockReturnValue(storage) }
    },
    brandQuery,
    storage
  };
}

describe('geração de imagem de carrossel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valida marca, conteúdo, estilo e proporção antes de usar I/O', () => {
    expect(() => validateCarouselImageInput(validInput({ brandId: 'brand-1' }))).toThrow('Marca inválida.');
    expect(() => validateCarouselImageInput(validInput({ slide: { headline: '', body: 'texto' } }))).toThrow('Título do slide inválido.');
    expect(() => validateCarouselImageInput(validInput({ style: '' }))).toThrow('Estilo visual inválido.');
    expect(() => validateCarouselImageInput(validInput({ aspectRatio: '3:2' }))).toThrow('Proporção inválida.');
  });

  it('aceita capa sem corpo quando o título já descreve a imagem', () => {
    expect(validateCarouselImageInput(validInput({
      slide: { headline: 'Pare de perder clientes', body: '' }
    })).slide.body).toBe('');
  });

  it('compõe um prompt original, visual e alinhado à marca sem pedir texto rasterizado', () => {
    const prompt = buildCarouselImagePrompt({
      brand: { name: 'Acme', category: 'consultoria' },
      kit: { audience: 'PMEs', tone: 'direto', visual_style: 'clean', palette: { primary: '#112233' } },
      ...validInput()
    });
    expect(prompt).toContain('original, rights-safe');
    expect(prompt).toContain('brand Acme');
    expect(prompt).toContain('Pare de perder clientes');
    expect(prompt).toContain('Do not render words');
    expect(prompt.length).toBeLessThanOrEqual(600);
  });

  it('confirma o dono, usa provider/storage mockados e retorna somente o contrato público', async () => {
    const { client, brandQuery, storage } = supabaseMock();
    const imageProvider = vi.fn().mockResolvedValue({
      bytes: Buffer.from('fake-image'), contentType: 'image/png', model: 'flux'
    });

    const result = await generateCarouselImage({ supabase: client, userId: 'user-1', input: validInput(), imageProvider });

    expect(brandQuery.eq).toHaveBeenCalledWith('id', BRAND_ID);
    expect(brandQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(imageProvider).toHaveBeenCalledWith(expect.objectContaining({ width: 1080, height: 1350 }));
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^temp/${BRAND_ID}/.+-carousel-ai\\.png$`)),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: false })
    );
    expect(Object.keys(result).sort()).toEqual(['altText', 'model', 'path', 'url']);
    expect(result.model).toBe('flux');
    expect(client.from).toHaveBeenCalledTimes(2);
    expect(client.from).not.toHaveBeenCalledWith('posts_media');
  });

  it('bloqueia marca de outro usuário antes de chamar provider ou storage', async () => {
    const { client, storage } = supabaseMock({ brand: null });
    const imageProvider = vi.fn();

    await expect(generateCarouselImage({ supabase: client, userId: 'user-1', input: validInput(), imageProvider }))
      .rejects.toMatchObject({ status: 403, code: 'brand_forbidden' });
    expect(imageProvider).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('traduz falhas do provider e storage sem expor detalhes internos', async () => {
    const providerMocks = supabaseMock();
    const provider = vi.fn().mockRejectedValue(new Error('secret provider details'));
    await expect(generateCarouselImage({ supabase: providerMocks.client, userId: 'user-1', input: validInput(), imageProvider: provider }))
      .rejects.toEqual(expect.objectContaining({
        message: 'Não foi possível gerar a imagem agora. Tente novamente.',
        code: 'generation_failed'
      }));

    const storageMocks = supabaseMock({ uploadError: { message: 'bucket internals' } });
    await expect(generateCarouselImage({
      supabase: storageMocks.client,
      userId: 'user-1',
      input: validInput(),
      imageProvider: vi.fn().mockResolvedValue({ bytes: Buffer.from('image'), contentType: 'image/jpeg', model: 'flux' })
    })).rejects.toEqual(expect.objectContaining({
      message: 'A imagem foi gerada, mas não foi possível salvá-la. Tente novamente.',
      code: 'upload_failed'
    }));
  });

  it('explicita o ciclo temporário e delega a expiração ao helper existente', async () => {
    cleanupMocks.cleanOrphanedTempMedia.mockResolvedValue({ ok: true, removedCount: 0 });
    const supabase = { storage: {} };
    expect(CAROUSEL_IMAGE_LIFECYCLE).toEqual(expect.objectContaining({
      bucket: 'media',
      pathTemplate: 'temp/<brandId>/<generated-file>',
      permanentDatabaseRecord: false,
      expiresAfterHours: 24,
      cleanupHelper: 'cleanOrphanedTempMedia'
    }));
    await expect(cleanExpiredCarouselImages({ supabase, dryRun: true })).resolves.toEqual({ ok: true, removedCount: 0 });
    expect(cleanupMocks.cleanOrphanedTempMedia).toHaveBeenCalledWith({ supabase, maxAgeHours: 24, dryRun: true });
    expect(new CarouselImageError('x')).toMatchObject({ status: 400, code: 'invalid_request' });
  });
});
