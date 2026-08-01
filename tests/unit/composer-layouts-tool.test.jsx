import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

// O estado vazio do canvas também tem botões "Mídia" e "Layout"; as buscas por
// ferramenta precisam mirar na barra lateral para não pegarem os dois.
const rail = () => within(screen.getByLabelText('Ferramentas do Composer'));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', async (importOriginal) => ({
  ...(await importOriginal()), uploadTempMedia: vi.fn(), removeTempMedia: vi.fn()
}));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));
vi.mock('@/lib/layout-actions', () => ({
  getLayoutTemplates: vi.fn(async () => ({ templates: [] })),
  saveLayoutTemplate: vi.fn(),
  deleteLayoutTemplate: vi.fn(),
  renameLayoutTemplate: vi.fn()
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

// O Composer tinha três caminhos de arte convivendo: copiar prompt para uma IA
// externa, o painel de notícia e o motor de layouts. Nenhum ficou — o post é um
// editor manual, e este teste existe para que nenhum deles volte sem querer.
describe('Composer: nenhum caminho de geração de arte', () => {
  it('a barra vai direto para a forma da peça, sem seção de conteúdo', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    expect(rail().queryByRole('button', { name: 'Criar' })).toBeNull();
    expect(rail().getByRole('button', { name: 'Layout' })).toBeTruthy();
  });

  it('não oferece mais "Criar com IA externa" no painel de Mídia', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    fireEvent.click(rail().getByRole('button', { name: /Mídia|Midia/ }));
    expect(screen.queryByRole('button', { name: /Criar com IA externa/ })).toBeNull();
    expect(screen.queryByText(/Copiar prompt/)).toBeNull();
    // O upload manual continua: tirar a IA externa não pode custar a mídia própria.
    expect(screen.getByLabelText('Importar mídia')).toBeTruthy();
  });

  // O campo "Tema" era a entrada do motor de IA. Ele saiu com a seção "Criar".
  it('não existe mais campo de tema pedindo o que a IA deve escrever', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    expect(screen.queryByLabelText('Tema')).toBeNull();
  });

  // Layout é a seção que abre sozinha agora: era "Criar" que ocupava esse lugar.
  it('Layout abre sozinho nos layouts salvos, sem catálogo nem estilo', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    expect(screen.queryByRole('button', { name: /Escolher por mim/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Ver todos os layouts/ })).toBeTruthy();
  });
});
