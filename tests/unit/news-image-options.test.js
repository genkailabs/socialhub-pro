import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pollinationsImage: vi.fn(),
  hasPollinationsKey: vi.fn(() => true)
}));

vi.mock('next/og', () => ({ ImageResponse: class {} }));
vi.mock('@/lib/ai/pollinations-image', () => ({
  pollinationsImage: mocks.pollinationsImage,
  hasPollinationsKey: mocks.hasPollinationsKey,
  POLLINATIONS_IMAGE_MODEL: 'flux'
}));

import { generateNewsImageOptions } from '@/lib/ai/generate';

function supabaseStub() {
  return {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${path}` } })
      })
    }
  };
}

describe('generateNewsImageOptions', () => {
  it('propaga basePrompt e devolve exatamente quatro imagens', async () => {
    mocks.pollinationsImage.mockResolvedValue({ bytes: Buffer.from('image'), contentType: 'image/png' });

    const result = await generateNewsImageOptions({
      supabase: supabaseStub(),
      brandId: 'brand-1',
      topic: 'Planejamento de conteudo',
      caption: 'Legenda',
      direction: 'minimalista',
      basePrompt: 'editorial desk with a clean calendar'
    });

    expect(result.imageUrls).toHaveLength(4);
    expect(mocks.pollinationsImage).toHaveBeenCalledTimes(4);
    expect(mocks.pollinationsImage.mock.calls[0][0].prompt).toContain('editorial desk with a clean calendar');
  });

  it('falha quando uma das quatro imagens nao fica pronta', async () => {
    mocks.pollinationsImage
      .mockResolvedValueOnce({ bytes: Buffer.from('one'), contentType: 'image/png' })
      .mockResolvedValueOnce({ bytes: Buffer.from('two'), contentType: 'image/png' })
      .mockRejectedValueOnce(new Error('provider indisponivel'))
      .mockResolvedValueOnce({ bytes: Buffer.from('four'), contentType: 'image/png' });

    await expect(generateNewsImageOptions({
      supabase: supabaseStub(),
      brandId: 'brand-1',
      topic: 'Planejamento de conteudo'
    })).rejects.toThrow('Nao foi possivel gerar as quatro imagens. Tente novamente.');
  });
});
