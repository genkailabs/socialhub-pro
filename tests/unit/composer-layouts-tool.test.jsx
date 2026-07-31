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
  // "Estratégia" e "Layouts" viraram "Criar" e "Layout": o conteúdo é escrito
  // num, a forma é escolhida no outro.
  it('oferece as seções Criar e Layout na barra', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    expect(rail().getByRole('button', { name: 'Criar' })).toBeTruthy();
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

  // "Criar" é a seção que abre sozinha: a primeira decisão da peça é o
  // conteúdo. Modo padrão é "Com IA", então o primeiro campo pede o tema.
  it('o conteúdo é escrito em Criar, que já abre aberta', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    expect(screen.getByLabelText('Tema')).toBeTruthy();
  });

  it('Layout abre com a escolha automática de estrutura e de estilo', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    fireEvent.click(rail().getByRole('button', { name: 'Layout' }));
    // "Escolher por mim" é o padrão nos dois: sem ele o usuário precisaria
    // entender o catálogo interno antes de conseguir a primeira arte.
    expect(screen.getAllByRole('button', { name: /Escolher por mim/ }).length).toBe(2);
    expect(screen.getByText(/O Hub lê o conteúdo e decide/)).toBeTruthy();
  });
});
