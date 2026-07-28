import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// A orquestração da geração saiu do painel e subiu para o Composer: o modal de
// progresso é da tela inteira e o estado vazio do canvas dispara o mesmo fluxo.
// Por isso este arquivo passou a testar o caminho completo, não o painel solto.
const actions = vi.hoisted(() => ({
  buildLayoutForContent: vi.fn(),
  generateLayoutFromBrief: vi.fn(),
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

const builtSurface = { media: null, bg: { x: 0, y: 0, scale: 1, rot: 0 }, layers: [{ id: 'x', type: 'text', text: 'Montado', x: 10, y: 10, w: 200, h: 40, fs: 24, op: 1, rot: 0 }] };

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

function openLayouts() {
  render(<VisualComposer brandId="brand-1" brandName="genkailabs" />);
  fireEvent.click(rail().getByRole('button', { name: /Layouts/ }));
}

/** Abre o popover do botão único e escolhe um dos dois caminhos (§6). */
function gerar(opcao) {
  fireEvent.click(screen.getByRole('button', { name: /Gerar arte/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(opcao) }));
}

describe('Composer — painel de Layouts', () => {
  it('oferece escolha automática de estrutura e de estilo', () => {
    openLayouts();
    expect(screen.getByText(/manchete, lista, comparação ou citação/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /A IA escolhe/ }).length).toBe(2);
  });

  it('mostra as estruturas manuais só quando o usuário pede', () => {
    openLayouts();
    expect(screen.queryByRole('button', { name: 'Citação' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    expect(screen.getByRole('button', { name: 'Citação' })).toBeTruthy();
  });

  it('um único botão primário abre as duas formas de montar', () => {
    openLayouts();
    expect(screen.queryByRole('menuitem')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Gerar arte/ }));
    expect(screen.getByRole('menuitem', { name: /Montar com o conteúdo atual/ })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /Escrever o conteúdo e montar/ })).toBeTruthy();
  });

  it('não monta sem título e diz o porquê', async () => {
    openLayouts();
    gerar('Montar com o conteúdo atual');
    expect((await screen.findByRole('alert')).textContent).toMatch(/título/);
    expect(actions.buildLayoutForContent).not.toHaveBeenCalled();
  });

  it('monta a peça e entrega as camadas ao canvas', async () => {
    actions.buildLayoutForContent.mockResolvedValue({
      ok: true, slides: [{ surface: builtSurface }], mascot: ['Este conteúdo é uma notícia.'], issues: []
    });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nova regra do imposto' } });
    gerar('Montar com o conteúdo atual');

    await waitFor(() => expect(actions.buildLayoutForContent).toHaveBeenCalledTimes(1));
    expect(actions.buildLayoutForContent.mock.calls[0][0].content.title).toBe('Nova regra do imposto');
    expect(actions.buildLayoutForContent.mock.calls[0][0].structureId).toBeNull();
    expect(await screen.findByText(/Este conteúdo é uma notícia/)).toBeTruthy();
  });

  it('repassa a escolha manual de estrutura e de estilo', async () => {
    actions.buildLayoutForContent.mockResolvedValue({ ok: true, slides: [{ surface: builtSurface }], mascot: [], issues: [] });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Titulo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Citação' }));
    fireEvent.click(screen.getByRole('button', { name: /^Premium$/ }));
    gerar('Montar com o conteúdo atual');

    await waitFor(() => expect(actions.buildLayoutForContent).toHaveBeenCalled());
    expect(actions.buildLayoutForContent.mock.calls[0][0].structureId).toBe('citacao');
    expect(actions.buildLayoutForContent.mock.calls[0][0].styleId).toBe('premium');
  });

  it('mostra o que ainda precisa do usuário quando a validação não fecha', async () => {
    actions.buildLayoutForContent.mockResolvedValue({
      ok: false,
      slides: [{ surface: builtSurface }],
      mascot: [],
      issues: [{ id: 'cta_ausente', message: 'A peça exige chamada para ação.', fix: 'Adicionar um CTA curto.' }]
    });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Titulo' } });
    gerar('Montar com o conteúdo atual');
    expect(await screen.findByText(/chamada para ação/)).toBeTruthy();
  });

  // O campo de itens escondia a regra: 2 linhas viram comparação, 3 viram
  // lista, e em carrossel cada linha vira um slide. Nada disso aparecia.
  it('o campo de itens diz o que os itens provocam, e acompanha o formato', () => {
    openLayouts();
    expect(screen.getByText(/Sem itens: a arte sai com título e subtítulo/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Itens/), { target: { value: 'um\ndois\ntrês' } });
    expect(screen.getByText('3 itens · habilita o layout de Lista.')).toBeTruthy();

    // Trocar o formato muda o efeito dos mesmos itens.
    fireEvent.click(within(screen.getByRole('group', { name: 'Formato e proporção' }))
      .getByRole('button', { name: 'Carrossel' }));
    expect(screen.getByText('3 itens · viram 4 slides (capa + 3).')).toBeTruthy();
  });

  it('avisa quando a estrutura escolhida à mão não tem itens suficientes', () => {
    openLayouts();
    fireEvent.change(screen.getByLabelText(/Itens/), { target: { value: 'só um' } });
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByText(/precisa de 3 itens — você tem 1/)).toBeTruthy();
  });

  it('preenche os campos a partir da legenda existente', () => {
    render(<VisualComposer brandId="brand-1" brandName="genkailabs" initialDraft={{ editor_state: { caption: 'Primeira linha do post\nSegunda linha explicando' } }} />);
    fireEvent.click(rail().getByRole('button', { name: /Layouts/ }));
    fireEvent.click(screen.getByRole('button', { name: /Preencher com a legenda/ }));
    expect(screen.getByLabelText('Título').value).toBe('Primeira linha do post');
    expect(screen.getByLabelText('Subtítulo').value).toBe('Segunda linha explicando');
  });
});

describe('Composer — falha da IA (§8)', () => {
  it('troca a mensagem técnica pela amigável e esconde o detalhe', async () => {
    actions.generateLayoutFromBrief.mockResolvedValue({
      error: 'Não foi possível montar a arte. Tente novamente.',
      code: 'AI_INVALID_JSON',
      detail: 'AI_INVALID_JSON · resposta truncada em 1842 tokens'
    });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Tema qualquer' } });
    gerar('Escrever o conteúdo e montar');

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Não foi possível montar a arte. Tente novamente.')).toBeTruthy();
    // Nada de jargão na superfície: o detalhe só existe atrás do disclosure.
    expect(within(dialog).queryByText(/AI_INVALID_JSON/)).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: /Ver detalhes técnicos/ }));
    expect(within(dialog).getByText(/AI_INVALID_JSON · resposta truncada/)).toBeTruthy();
  });

  it('tentar novamente refaz a mesma chamada', async () => {
    actions.generateLayoutFromBrief.mockResolvedValue({ error: 'Não foi possível montar a arte. Tente novamente.', code: 'AI_INVALID_JSON' });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Tema qualquer' } });
    gerar('Escrever o conteúdo e montar');

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Tentar novamente/ }));
    await waitFor(() => expect(actions.generateLayoutFromBrief).toHaveBeenCalledTimes(2));
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

  it('aplica um layout salvo sem ida ao servidor', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Assunto novo' } });
    fireEvent.click(screen.getByRole('button', { name: /Biblioteca de layouts/ }));

    const card = await screen.findByRole('button', { name: 'Aplicar layout Manchete da marca' });
    fireEvent.click(card);

    expect(actions.buildLayoutForContent).not.toHaveBeenCalled();
    // O conteúdo digitado entra no lugar do exemplo salvo no template.
    await waitFor(() => expect(screen.getAllByText('Assunto novo').length).toBeGreaterThan(0));
  });

  it('filtra por categoria e por busca', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    openLayouts();
    fireEvent.click(screen.getByRole('button', { name: /Biblioteca de layouts/ }));
    await screen.findByRole('button', { name: 'Aplicar layout Manchete da marca' });

    fireEvent.change(screen.getByLabelText('Buscar layout'), { target: { value: 'manchete da marca' } });
    expect(screen.getByRole('button', { name: 'Aplicar layout Manchete da marca' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Buscar layout'), { target: { value: 'nada disso' } });
    expect(screen.getByText('Nenhum layout encontrado.')).toBeTruthy();
  });

  it('renomeia um layout salvo reaproveitando a mesma linha', async () => {
    actions.getLayoutTemplates.mockResolvedValue({ templates: [saved] });
    actions.renameLayoutTemplate.mockResolvedValue({ ok: true, name: 'Outro nome' });
    openLayouts();
    fireEvent.click(screen.getByRole('button', { name: /Biblioteca de layouts/ }));

    fireEvent.click(await screen.findByRole('button', { name: 'Renomear layout Manchete da marca' }));
    const input = screen.getByLabelText('Novo nome para Manchete da marca');
    fireEvent.change(input, { target: { value: 'Outro nome' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(actions.renameLayoutTemplate).toHaveBeenCalledWith({
      brandId: 'brand-1', templateId: 't1', name: 'Outro nome'
    }));
  });

  it('aplicar uma estrutura padrão monta com o conteúdo atual', async () => {
    actions.buildLayoutForContent.mockResolvedValue({ ok: true, slides: [{ surface: builtSurface }], mascot: [], issues: [] });
    openLayouts();
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Tema' } });
    fireEvent.click(screen.getByRole('button', { name: /Biblioteca de layouts/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar layout Manchete' }));

    await waitFor(() => expect(actions.buildLayoutForContent).toHaveBeenCalled());
    expect(actions.buildLayoutForContent.mock.calls[0][0].structureId).toBe('manchete');
  });
});
