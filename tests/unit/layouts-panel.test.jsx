import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// A seção "Criar" e toda a geração de arte saíram do Composer de post. O que
// este arquivo cobre agora é o que sobrou de layout: os layouts salvos pela
// pessoa, aplicados no cliente — e a garantia de que a geração não voltou
// escondida em nenhum canto da tela.
const actions = vi.hoisted(() => ({
  getLayoutTemplates: vi.fn(),
  saveLayoutTemplate: vi.fn(),
  deleteLayoutTemplate: vi.fn(),
  renameLayoutTemplate: vi.fn()
}));

vi.mock('@/lib/layout-actions', () => actions);
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
  for (const fn of Object.values(actions)) fn.mockReset();
  actions.getLayoutTemplates.mockResolvedValue({ templates: [] });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
});

afterEach(() => { cleanup(); localStorage.clear(); });

const rail = () => within(screen.getByLabelText('Ferramentas do Composer'));

// O botão da barra é um toggle e "Layout" já abre sozinho: clicar sem olhar
// fecharia o painel em vez de abri-lo. A classe ativa vem do CSS module, então
// o nome real tem hash — daí o `includes`.
function abrir(secao) {
  const botao = rail().getByRole('button', { name: secao });
  if (!botao.className.includes('railActive')) fireEvent.click(botao);
}

function montar(props = {}) {
  render(<VisualComposer brandId="brand-1" brandName="genkailabs" {...props} />);
}

describe('Composer — a seção "Criar" não existe mais', () => {
  it('a barra não oferece "Criar"', () => {
    montar();
    expect(rail().queryByRole('button', { name: 'Criar' })).toBeNull();
    expect(rail().getByRole('button', { name: 'Layout' })).toBeTruthy();
  });

  // O painel escrevia tema, objetivo e tipo de peça e chamava o motor. Nenhum
  // desses controles pode ter sobrado solto na tela.
  it('não sobrou campo nem botão de geração em lugar nenhum', () => {
    montar();
    expect(screen.queryByLabelText('Tema')).toBeNull();
    expect(screen.queryByLabelText('Título')).toBeNull();
    expect(screen.queryByLabelText('Objetivo')).toBeNull();
    expect(screen.queryByLabelText('Tipo de peça')).toBeNull();
    expect(screen.queryByRole('button', { name: /Escrever com IA e montar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Montar com meu conteúdo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Manual' })).toBeNull();
  });

  // O estado vazio tinha "Escrever conteúdo" como porta principal, e ela abria
  // o painel que não existe mais.
  it('o canvas vazio oferece só as portas que fazem alguma coisa', () => {
    montar();
    const vazio = within(screen.getByTestId('composer-empty-state'));
    expect(vazio.queryByRole('button', { name: /Escrever conteúdo/ })).toBeNull();
    expect(vazio.getByRole('button', { name: /Adicionar mídia/ })).toBeTruthy();
    expect(vazio.getByRole('button', { name: /Layout/ })).toBeTruthy();
    expect(vazio.getByRole('button', { name: /Texto/ })).toBeTruthy();
  });

  it('escolher Carrossel troca o Composer pelo Studio', () => {
    montar();
    fireEvent.click(within(screen.getByRole('group', { name: 'Formato' }))
      .getByRole('button', { name: 'Carrossel' }));

    expect(screen.getByText('Editor visual do Carrossel Studio')).toBeTruthy();
  });
});

describe('Composer — painel Layout', () => {
  it('abre sozinho e manda o resto para a Biblioteca', () => {
    montar();
    expect(screen.getByRole('button', { name: /Ver todos os layouts/ })).toBeTruthy();
  });

  // Estrutura e estilo alimentavam o motor. Sem motor, escolher qualquer um
  // dos dois não mudava nada na peça.
  it('não oferece mais escolha de estrutura nem de estilo', () => {
    montar();
    abrir('Layout');
    expect(screen.queryByText(/O Hub lê o conteúdo e decide/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Escolher por mim/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Premium$/ })).toBeNull();
  });
});

describe('Composer — biblioteca de layouts (§12)', () => {
  const saved = {
    id: 't1', name: 'Manchete da marca', format: 'post', ratio: '1:1', category: 'jornalistico',
    template: {
      version: 1, canvas: [430, 430], elements: [
        { id: 'e1', componentId: 'titulo', behavior: 'dynamic', sample: 'Exemplo', layer: { type: 'text', text: 'Exemplo', x: 10, y: 10, w: 200, h: 40, fs: 24 } }
      ]
    }
  };

  function abrirBiblioteca() {
    abrir('Layout');
    fireEvent.click(screen.getByRole('button', { name: /Ver todos os layouts/ }));
  }

  // O catálogo de estruturas só era aplicável pelo motor: clicar nele agora não
  // montaria nada, então ele não é oferecido.
  it('lista só os layouts salvos, não o catálogo de estruturas', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    montar();
    abrirBiblioteca();

    await screen.findByRole('button', { name: 'Aplicar layout Manchete da marca' });
    expect(screen.queryByRole('button', { name: 'Aplicar layout Manchete' })).toBeNull();
  });

  it('a biblioteca vazia diz o que fazer para preenchê-la', async () => {
    montar();
    abrirBiblioteca();
    expect(await screen.findByText(/ainda não salvou nenhum layout/)).toBeTruthy();
  });

  // Sem os campos do painel Criar, o texto da peça vem da legenda: primeira
  // linha vira o título que entra no lugar do exemplo salvo no template.
  it('aplica um layout salvo usando a legenda como conteúdo', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    montar({ initialDraft: { editor_state: { caption: 'Assunto novo\nSegunda linha' } } });
    abrirBiblioteca();

    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar layout Manchete da marca' }));
    await waitFor(() => expect(screen.getAllByText('Assunto novo').length).toBeGreaterThan(0));
  });

  it('filtra por busca', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    montar();
    abrirBiblioteca();
    await screen.findByRole('button', { name: 'Aplicar layout Manchete da marca' });

    fireEvent.change(screen.getByLabelText('Buscar layout'), { target: { value: 'manchete da marca' } });
    expect(screen.getByRole('button', { name: 'Aplicar layout Manchete da marca' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar layout'), { target: { value: 'nada disso' } });
    expect(screen.getByText('Nenhum layout encontrado.')).toBeTruthy();
  });

  it('renomeia um layout salvo reaproveitando a mesma linha', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    actions.renameLayoutTemplate.mockResolvedValue({ ok: true, name: 'Outro nome' });
    montar();
    abrirBiblioteca();

    fireEvent.click(await screen.findByRole('button', { name: 'Renomear layout Manchete da marca' }));
    const input = screen.getByLabelText('Novo nome para Manchete da marca');
    fireEvent.change(input, { target: { value: 'Outro nome' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(actions.renameLayoutTemplate).toHaveBeenCalledWith({
      brandId: 'brand-1', templateId: 't1', name: 'Outro nome'
    }));
  });
});
