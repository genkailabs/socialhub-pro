import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));

import { getStudioDraft } from '@/lib/carrossel-studio-data';

function builderComDado(data) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    contains: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null })
  };
  return builder;
}

const rascunho = {
  id: 'studio-draft-1',
  media_urls: ['https://cdn.test/slide-1.png'],
  production: {
    source: 'carrossel-studio',
    editorState: {
      doc: { name: 'Checklist' },
      editorial: { approvedAt: '2026-07-30T00:00:00.000Z', sources: [{ id: 'source-1' }] }
    }
  }
};

describe('getStudioDraft', () => {
  it('busca o último rascunho do Studio quando ninguém pediu um post específico', async () => {
    const builder = builderComDado(rascunho);
    mocks.createClient.mockResolvedValue({ from: vi.fn(() => builder) });

    await expect(getStudioDraft('brand-1')).resolves.toEqual({
      id: 'studio-draft-1',
      doc: { name: 'Checklist' },
      mediaUrls: ['https://cdn.test/slide-1.png'],
      editorial: { approvedAt: '2026-07-30T00:00:00.000Z', sources: [{ id: 'source-1' }] }
    });
    expect(builder.contains).toHaveBeenCalledWith('production', { source: 'carrossel-studio' });
    expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  // O bug: com dois carrosséis salvos, "editar" abria sempre o mais recente
  // porque o id vinha na URL e ninguém o usava.
  it('abre o carrossel pedido pelo id, sem cair no mais recente', async () => {
    const builder = builderComDado({ ...rascunho, id: 'studio-draft-2' });
    mocks.createClient.mockResolvedValue({ from: vi.fn(() => builder) });

    const draft = await getStudioDraft('brand-1', 'studio-draft-2');

    expect(draft.id).toBe('studio-draft-2');
    expect(builder.eq).toHaveBeenCalledWith('id', 'studio-draft-2');
    expect(builder.eq).toHaveBeenCalledWith('brand_id', 'brand-1');
    expect(builder.order).not.toHaveBeenCalled();
  });

  // Pedir um post que não é do Studio (ou não é da marca) e receber outro
  // qualquer seria pior do que não receber nada.
  it('devolve nada quando o post pedido não existe', async () => {
    const builder = builderComDado(null);
    mocks.createClient.mockResolvedValue({ from: vi.fn(() => builder) });

    await expect(getStudioDraft('brand-1', 'post-de-outra-marca')).resolves.toBeNull();
  });

  // Rascunho é o que ainda não tem data; um carrossel já agendado continua
  // editável pelo mesmo caminho, então a busca por id não filtra por status.
  it('abre pelo id também o carrossel já agendado', async () => {
    const builder = builderComDado({ ...rascunho, id: 'studio-agendado' });
    mocks.createClient.mockResolvedValue({ from: vi.fn(() => builder) });

    await expect(getStudioDraft('brand-1', 'studio-agendado')).resolves.toMatchObject({ id: 'studio-agendado' });
    expect(builder.eq).not.toHaveBeenCalledWith('status', 'draft');
  });
});
