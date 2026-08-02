import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { approveContent } from '@/lib/content-actions';

function supabaseCom(post) {
  const updates = [];
  const update = vi.fn((payload) => {
    updates.push(payload);
    return { eq: vi.fn().mockResolvedValue({ error: null }) };
  });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: post, error: null }) })) })),
      update
    }))
  });
  return updates;
}

const amanha = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('aprovar conteúdo que ainda não tem data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recusa aprovar sem dia e hora, em vez de criar um agendado que nunca sai', async () => {
    supabaseCom({ id: 'p1', format: 'carousel', brand_id: 'b1', scheduled_at: null });

    expect(await approveContent({ postId: 'p1' })).toEqual({ error: 'Escolha o dia e a hora da publicação.' });
  });

  it('recusa data no passado', async () => {
    supabaseCom({ id: 'p1', format: 'carousel', brand_id: 'b1', scheduled_at: null });
    const ontem = new Date(Date.now() - 60_000).toISOString();

    expect(await approveContent({ postId: 'p1', scheduledAt: ontem })).toEqual({ error: 'Escolha uma data/hora no futuro.' });
  });

  it('grava a data junto do status quando ela é escolhida', async () => {
    const updates = supabaseCom({ id: 'p1', format: 'carousel', brand_id: 'b1', scheduled_at: null });
    const quando = amanha();

    const res = await approveContent({ postId: 'p1', scheduledAt: quando });

    expect(res).toEqual({ ok: true, status: 'scheduled' });
    expect(updates[0]).toEqual({ status: 'scheduled', scheduled_at: new Date(quando).toISOString() });
  });

  it('post que já tem data continua aprovando sem pedir nada', async () => {
    const updates = supabaseCom({ id: 'p1', format: 'carousel', brand_id: 'b1', scheduled_at: amanha() });

    const res = await approveContent({ postId: 'p1' });

    expect(res.ok).toBe(true);
    expect(updates[0]).toEqual({ status: 'scheduled' });
  });

  // Hoje todo formato do registro é publicável (lib/formats.js), então a data
  // é exigida em todos. Se algum voltar a ser entregue como roteiro, o caminho
  // sem data volta a existir — e é isto que este teste vigia.
  it('cobra data em qualquer formato que o Hub publica sozinho', async () => {
    for (const format of ['image', 'carousel', 'reel', 'stories']) {
      supabaseCom({ id: 'p1', format, brand_id: 'b1', scheduled_at: null });
      expect(await approveContent({ postId: 'p1' })).toEqual({ error: 'Escolha o dia e a hora da publicação.' });
    }
  });
});
