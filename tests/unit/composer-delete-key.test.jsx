import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
});

afterEach(() => { cleanup(); localStorage.clear(); });

async function renderWithSelectedLayer() {
  render(<VisualComposer brandId="brand-1" brandName="Marca" />);
  fireEvent.click(screen.getByRole('button', { name: /Elemen/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Retângulo' }));
  await waitFor(() => expect(screen.getByLabelText('Opacidade')).toBeTruthy());
}

describe('tecla Delete no canvas', () => {
  it('Delete remove a camada selecionada', async () => {
    await renderWithSelectedLayer();
    fireEvent.keyDown(window, { key: 'Delete' });
    await waitFor(() => expect(screen.getByText('Adicione textos, formas ou figurinhas ao canvas.')).toBeTruthy());
  });

  it('Backspace também remove a camada selecionada', async () => {
    await renderWithSelectedLayer();
    fireEvent.keyDown(window, { key: 'Backspace' });
    await waitFor(() => expect(screen.getByText('Adicione textos, formas ou figurinhas ao canvas.')).toBeTruthy());
  });

  it('não remove a camada enquanto o usuário digita em um campo', async () => {
    await renderWithSelectedLayer();
    fireEvent.click(screen.getByRole('button', { name: /Legenda/ }));
    const caption = screen.getByPlaceholderText('Escreva a legenda…');
    fireEvent.keyDown(caption, { key: 'Backspace' });
    expect(screen.queryByText('Adicione textos, formas ou figurinhas ao canvas.')).toBeNull();
  });
});
