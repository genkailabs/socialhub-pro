import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CarouselStudioClient } from '@/components/carrossel/CarouselStudioClient';
import { saveDraft } from '@/lib/posts-actions';
import { removeTempMedia } from '@/lib/posts-media';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/posts-actions', () => ({
  saveDraft: vi.fn(async () => ({ id: 'draft-importado' })),
  deleteComposerDraft: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@/lib/posts-media', () => ({
  uploadTempMedia: vi.fn(),
  removeTempMedia: vi.fn(async () => ({ ok: true }))
}));
vi.mock('@/components/onboarding/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));
vi.mock('@/components/carrossel/CarouselStudioFrame', () => ({
  CarouselStudioFrame: ({ slideCount, initialScript, onChange }) => (
    <div data-testid="studio-frame" data-slide-count={slideCount || ''} data-script={initialScript || ''}>
      <button type="button" onClick={() => onChange?.({ name: 'Edição do Studio', slides: [] })}>Simular edição no Studio</button>
    </div>
  )
}));

describe('entrada de roteiro pronto no Composer', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('cola, salva e remonta o Studio com nove slides sem chamar IA', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<CarouselStudioClient brandId="brand-1" brand={{ name: 'GenkaiLabs' }} embedded />);

    fireEvent.click(screen.getByRole('button', { name: 'Colar roteiro pronto' }));
    const raw = Array.from({ length: 18 }, (_, index) => (
      `texto ${index + 1} - Conteúdo ${index + 1}`
    )).join('\n\n');
    fireEvent.change(screen.getByLabelText('Cole o texto aqui'), { target: { value: raw } });

    expect(screen.getByText('18 campos encontrados · 9 slides')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Aplicar texto no Studio/ }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(saveDraft.mock.calls[0][0].editorState.editorial).toMatchObject({
      source: 'pasted-script',
      rawScript: raw,
      blockCount: 18,
      slideCount: 9,
      headline: 'Conteúdo 1'
    });
    await waitFor(() => expect(screen.getByTestId('studio-frame').dataset.slideCount).toBe('9'));
    expect(screen.getByTestId('studio-frame').dataset.script).toContain('texto 18 - Conteúdo 18');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restaura roteiro e contagem de slides ao recarregar o rascunho', () => {
    const script = Array.from({ length: 12 }, (_, index) => `texto ${index + 1} - Bloco ${index + 1}`).join('\n\n');
    render(<CarouselStudioClient
      brandId="brand-1"
      brand={{ name: 'GenkaiLabs' }}
      draft={{ editorial: { source: 'pasted-script', rawScript: script, script, slideCount: 6, approvedAt: '2026-08-01T00:00:00.000Z' } }}
      embedded
    />);

    expect(screen.getByTestId('studio-frame').dataset.slideCount).toBe('6');
    expect(screen.getByTestId('studio-frame').dataset.script).toContain('texto 12 - Bloco 12');
  });

  it('cancela autosave atrasado antes de substituir o documento', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={{ name: 'GenkaiLabs' }} embedded />);
    fireEvent.click(screen.getByRole('button', { name: 'Simular edição no Studio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Colar roteiro pronto' }));
    const raw = Array.from({ length: 6 }, (_, index) => `texto ${index + 1} - Conteúdo ${index + 1}`).join('\n');
    fireEvent.change(screen.getByLabelText('Cole o texto aqui'), { target: { value: raw } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar texto no Studio/ }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0].editorState.editorial.source).toBe('pasted-script');
  });

  it('aguarda um autosave em andamento antes de salvar o roteiro substituto', async () => {
    let releaseAutosave;
    saveDraft.mockImplementationOnce(() => new Promise((resolve) => {
      releaseAutosave = () => resolve({ id: 'draft-autosave' });
    }));
    render(<CarouselStudioClient brandId="brand-1" brand={{ name: 'GenkaiLabs' }} embedded />);
    fireEvent.click(screen.getByRole('button', { name: 'Simular edição no Studio' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1), { timeout: 1200 });

    fireEvent.click(screen.getByRole('button', { name: 'Colar roteiro pronto' }));
    const raw = Array.from({ length: 6 }, (_, index) => `texto ${index + 1} - Novo ${index + 1}`).join('\n');
    fireEvent.change(screen.getByLabelText('Cole o texto aqui'), { target: { value: raw } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar texto no Studio/ }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(saveDraft).toHaveBeenCalledTimes(1);
    releaseAutosave();
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(saveDraft.mock.calls[0][0].editorState.editorial).toBeUndefined();
    expect(saveDraft.mock.calls[1][0].editorState.editorial.source).toBe('pasted-script');
  });

  it('substitui mídias antigas por lista vazia e mantém a referência limpa', async () => {
    const previousUrls = ['https://cdn.test/antiga-1.png', 'https://cdn.test/antiga-2.png'];
    render(<CarouselStudioClient
      brandId="brand-1"
      brand={{ name: 'GenkaiLabs' }}
      draft={{ id: 'draft-antigo', doc: { name: 'Antigo', slides: [] }, mediaUrls: previousUrls }}
      embedded
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Colar roteiro pronto' }));
    const raw = Array.from({ length: 6 }, (_, index) => `texto ${index + 1} - Conteúdo ${index + 1}`).join('\n');
    fireEvent.change(screen.getByLabelText('Cole o texto aqui'), { target: { value: raw } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar texto no Studio/ }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(saveDraft.mock.calls[0][0].imageUrls).toEqual([]);
    await waitFor(() => expect(removeTempMedia).toHaveBeenCalledWith(expect.anything(), previousUrls));

    fireEvent.click(screen.getByRole('button', { name: 'Simular edição no Studio' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2), { timeout: 1500 });
    expect(saveDraft.mock.calls[1][0].imageUrls).toEqual([]);
  });

  it('mantém a importação concluída quando a limpeza de mídia falha', async () => {
    removeTempMedia.mockImplementationOnce(() => { throw new Error('storage indisponível'); });
    render(<CarouselStudioClient
      brandId="brand-1"
      brand={{ name: 'GenkaiLabs' }}
      draft={{ id: 'draft-antigo', mediaUrls: ['https://cdn.test/antiga.png'] }}
      embedded
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Colar roteiro pronto' }));
    const raw = Array.from({ length: 6 }, (_, index) => `texto ${index + 1} - Conteúdo ${index + 1}`).join('\n');
    fireEvent.change(screen.getByLabelText('Cole o texto aqui'), { target: { value: raw } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar texto no Studio/ }));

    await waitFor(() => expect(screen.getByTestId('studio-frame').dataset.slideCount).toBe('3'));
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });
});
