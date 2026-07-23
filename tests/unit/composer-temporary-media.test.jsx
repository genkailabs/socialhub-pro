import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeComposerDocument } from '@/lib/composer-editor';

const mocks = vi.hoisted(() => ({
  deleteComposerDraft: vi.fn(),
  removeTempMedia: vi.fn(),
  uploadTempMedia: vi.fn()
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({
  removeTempMedia: mocks.removeTempMedia,
  uploadTempMedia: mocks.uploadTempMedia
}));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(),
  saveDraft: vi.fn(),
  schedulePost: vi.fn(),
  deleteComposerDraft: mocks.deleteComposerDraft
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  mocks.deleteComposerDraft.mockReset().mockResolvedValue({ ok: true });
  mocks.removeTempMedia.mockReset().mockResolvedValue({ ok: true, paths: [] });
});

function openMediaPanel() {
  fireEvent.click(screen.getByRole('button', { name: /m.dia/i }));
}

describe('Composer temporary media panel', () => {
  it('shows only the temporary upload area when no file is selected', () => {
    render(<VisualComposer brandId="brand-1" brandName="socialhub" />);

    openMediaPanel();

    expect(screen.getAllByText(/adicionar m.dia/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/biblioteca/i)).toBeNull();
    expect(screen.queryByText(/hist.rico/i)).toBeNull();
  });

  it('shows current file information and removes the temporary object on request', async () => {
    const doc = makeComposerDocument();
    doc.post.media = {
      url: 'https://example.test/storage/v1/object/public/media/temp/brand-1/campanha.webp',
      path: 'temp/brand-1/campanha.webp',
      kind: 'image',
      name: 'campanha.webp',
      size: 153600
    };

    render(
      <VisualComposer
        brandId="brand-1"
        brandName="socialhub"
        initialDraft={{
          id: 'draft-1',
          editor_state: { format: 'post', ratio: '1:1', doc }
        }}
      />
    );

    openMediaPanel();

    expect(screen.getByText('campanha.webp')).toBeDefined();
    expect(screen.getByText(/150 KB/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /substituir arquivo/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /remover arquivo/i })).toBeDefined();
    expect(screen.queryByText(/biblioteca/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /remover arquivo/i }));

    await waitFor(() => {
      expect(mocks.removeTempMedia).toHaveBeenCalledWith(
        expect.anything(),
        ['temp/brand-1/campanha.webp']
      );
    });
    expect(screen.queryByText('campanha.webp')).toBeNull();
  });

  it('requires confirmation and deletes a saved draft with its media lifecycle', async () => {
    render(
      <VisualComposer
        brandId="brand-1"
        brandName="socialhub"
        initialDraft={{
          id: 'draft-1',
          editor_state: { format: 'post', ratio: '1:1', doc: makeComposerDocument() }
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir rascunho' }));
    expect(screen.getByText(/esta ação remove imediatamente/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() => {
      expect(mocks.deleteComposerDraft).toHaveBeenCalledWith({
        brandId: 'brand-1',
        draftId: 'draft-1'
      });
    });
    expect(screen.queryByRole('button', { name: 'Excluir rascunho' })).toBeNull();
  });
});
