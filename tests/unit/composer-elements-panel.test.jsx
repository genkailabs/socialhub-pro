import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

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

function openElements() {
  render(<VisualComposer brandId="brand-1" brandName="Marca" />);
  fireEvent.click(screen.getByRole('button', { name: /Elemen/ }));
}

describe('painel Elementos (PRD Elementos §3-§9)', () => {
  it('mostra as cinco categorias do PRD', () => {
    openElements();
    for (const name of ['Formas', 'Linhas e setas', 'Ícones', 'Stickers', 'Emojis']) {
      expect(screen.getByRole('tab', { name })).toBeTruthy();
    }
  });

  it('busca cruza categorias por palavra relacionada', () => {
    openElements();
    fireEvent.change(screen.getByLabelText('Buscar elementos'), { target: { value: 'seta' } });
    expect(screen.getByRole('button', { name: 'Seta dupla' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ícone Seta' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Formas' })).toBeNull();
  });

  it('busca encontra emoji por nome', () => {
    openElements();
    fireEvent.change(screen.getByLabelText('Buscar elementos'), { target: { value: 'pizza' } });
    expect(screen.getByRole('button', { name: 'Emoji 🍕' })).toBeTruthy();
  });

  it('insere ícone vetorial como camada e mostra propriedades', async () => {
    openElements();
    fireEvent.click(screen.getByRole('tab', { name: 'Ícones' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ícone WhatsApp' }));
    await waitFor(() => expect(screen.getByLabelText('Cor do elemento')).toBeTruthy());
    // O rótulo da seleção virou uma frase só ("WhatsApp · 1 de 1"), então o
    // texto exato não casa mais.
    // O rótulo aparece na barra do canvas e no cabeçalho de propriedades.
    expect(within(screen.getByRole('toolbar', { name: 'Ferramentas do canvas' })).getByText(/^WhatsApp · \d+ de \d+$/)).toBeTruthy();
  });

  it('insere forma e permite ajustar borda e sombra', async () => {
    openElements();
    fireEvent.click(screen.getByRole('button', { name: 'Estrela' }));
    await waitFor(() => expect(screen.getByLabelText('Espessura da borda')).toBeTruthy());
    expect(screen.getByLabelText('Aplicar sombra na forma')).toBeTruthy();
    expect(screen.getByLabelText('Opacidade do elemento')).toBeTruthy();
  });
});
