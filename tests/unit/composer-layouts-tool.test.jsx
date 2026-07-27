import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

// O estado vazio do canvas também tem botões "Mídia" e "Layout"; as buscas por
// ferramenta precisam mirar na barra lateral para não pegarem os dois.
const rail = () => within(screen.getByLabelText('Ferramentas do Composer'));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));
vi.mock('@/lib/layout-actions', () => ({
  buildLayoutForContent: vi.fn(),
  generateLayoutFromBrief: vi.fn(),
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
// externa, o painel de notícia e o motor de layouts. Só o motor ficou — este
// teste existe para que nenhum dos outros volte sem querer.
describe('Composer: um único caminho de arte', () => {
  it('oferece a ferramenta Layouts na barra', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    expect(rail().getByRole('button', { name: /Layouts/ })).toBeTruthy();
  });

  it('não oferece mais "Criar com IA externa" no painel de Mídia', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    fireEvent.click(rail().getByRole('button', { name: /Mídia|Midia/ }));
    expect(screen.queryByRole('button', { name: /Criar com IA externa/ })).toBeNull();
    expect(screen.queryByText(/Copiar prompt/)).toBeNull();
    // O upload manual continua: tirar a IA externa não pode custar a mídia própria.
    expect(screen.getByLabelText('Importar mídia')).toBeTruthy();
  });

  it('abre o painel de Layouts com a escolha automática', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    fireEvent.click(rail().getByRole('button', { name: /Layouts/ }));
    expect(screen.getByLabelText('Título')).toBeTruthy();
    // "A IA escolhe" é o padrão da estrutura: sem ele o usuário precisaria
    // entender o catálogo interno antes de conseguir a primeira arte.
    expect(screen.getAllByRole('button', { name: /A IA escolhe/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/manchete, lista, comparação ou citação/)).toBeTruthy();
  });
});
