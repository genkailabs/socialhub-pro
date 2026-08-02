import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  generateCarouselImage: vi.fn(),
  checkLimit: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/carrossel-image', async () => {
  const actual = await vi.importActual('@/lib/carrossel-image');
  return { ...actual, generateCarouselImage: mocks.generateCarouselImage };
});
vi.mock('@/lib/ai/limits', () => ({ checkLimit: mocks.checkLimit }));

import { POST } from '@/app/api/carrossel/image/route';
import { CarouselImageError } from '@/lib/carrossel-image';

function request(body = {}) {
  return new Request('http://localhost/api/carrossel/image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/carrossel/image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkLimit.mockResolvedValue({ allowed: true });
  });

  it('exige autenticação antes de gerar', async () => {
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } });
    const response = await POST(request());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Sessão expirada.' });
    expect(mocks.generateCarouselImage).not.toHaveBeenCalled();
  });

  it('repassa o usuário autenticado e devolve somente o resultado seguro', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockReturnValue({ insert })
    };
    mocks.createClient.mockResolvedValue(supabase);
    const result = { url: 'https://cdn/image.png', path: 'temp/brand/image.png', model: 'flux', altText: 'Imagem' };
    mocks.generateCarouselImage.mockResolvedValue(result);

    const body = { brandId: 'id', slide: { headline: 'h', body: 'b' }, style: 'clean', aspectRatio: '4:5' };
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(mocks.generateCarouselImage).toHaveBeenCalledWith({ supabase, userId: 'user-1', input: body });
    expect(mocks.checkLimit).toHaveBeenCalledWith(expect.objectContaining({
      supabase,
      brandId: 'id',
      skillId: 'carousel-image'
    }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 'id',
      user_id: 'user-1',
      skill_id: 'carousel-image',
      kind: 'image',
      provider: 'pollinations',
      model: 'flux',
      image_count: 1,
      status: 'success'
    }));
  });

  it('bloqueia a geração antes do provider quando a marca atingiu o limite', async () => {
    const supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn()
    };
    mocks.createClient.mockResolvedValue(supabase);
    mocks.checkLimit.mockResolvedValue({ allowed: false, reason: 'Limite de IA atingido.' });

    const response = await POST(request({ brandId: 'brand-1' }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'Limite de IA atingido.' });
    expect(mocks.generateCarouselImage).not.toHaveBeenCalled();
  });

  it('converte erros conhecidos em mensagem amigável e status correto', async () => {
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) } });
    mocks.generateCarouselImage.mockRejectedValue(new CarouselImageError('Marca inválida.', { status: 403 }));

    const response = await POST(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Marca inválida.' });
  });
});
