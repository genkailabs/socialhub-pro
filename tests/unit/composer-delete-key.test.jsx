import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', async (importOriginal) => ({
  ...(await importOriginal()), uploadTempMedia: vi.fn(), removeTempMedia: vi.fn()
}));
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
  await waitFor(() => expect(screen.getByLabelText('Opacidade do elemento')).toBeTruthy());
}

// Camadas virou seção da barra única: a lista só existe depois de abrir. É lá
// que "Nenhum elemento adicionado" aparece quando a peça fica vazia.
function openLayers() {
  fireEvent.click(screen.getByRole('button', { name: 'Camadas' }));
}

describe('tecla Delete no canvas', () => {
  it('Delete remove a camada selecionada', async () => {
    await renderWithSelectedLayer();
    fireEvent.keyDown(window, { key: 'Delete' });
    openLayers();
    await waitFor(() => expect(screen.getByText('Nenhum elemento adicionado')).toBeTruthy());
  });

  it('Backspace também remove a camada selecionada', async () => {
    await renderWithSelectedLayer();
    fireEvent.keyDown(window, { key: 'Backspace' });
    openLayers();
    await waitFor(() => expect(screen.getByText('Nenhum elemento adicionado')).toBeTruthy());
  });

  // Regressão: o guard antigo ignorava qualquer INPUT, então depois de encostar
  // num slider de propriedade (ou no input de arquivo do canvas) a tecla Delete
  // virava no-op e o usuário não conseguia mais apagar nada.
  it('Delete remove a camada mesmo com o foco num controle que não é de texto', async () => {
    await renderWithSelectedLayer();
    const opacity = screen.getByLabelText('Opacidade do elemento');
    fireEvent.keyDown(opacity, { key: 'Delete' });
    openLayers();
    await waitFor(() => expect(screen.getByText('Nenhum elemento adicionado')).toBeTruthy());
  });

  it('não remove a camada enquanto o usuário digita em um campo', async () => {
    await renderWithSelectedLayer();
    fireEvent.click(screen.getByRole('button', { name: /Legenda/ }));
    const caption = screen.getByPlaceholderText('Escreva a legenda…');
    fireEvent.keyDown(caption, { key: 'Backspace' });
    openLayers();
    expect(screen.queryByText('Nenhum elemento adicionado')).toBeNull();
  });
});
