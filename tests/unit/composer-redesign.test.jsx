import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { addLayer, makeComposerDocument } from '@/lib/composer-editor';

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
import { alignedPosition } from '@/components/composer/CanvasToolbar';
import { buildLibraryItems } from '@/components/composer/LayoutLibrary';

beforeAll(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });
});

afterEach(() => { cleanup(); localStorage.clear(); });

function draftWith(build) {
  const doc = makeComposerDocument();
  build(doc);
  return { id: 'draft-1', status: 'draft', editor_state: { format: 'post', ratio: '1:1', doc } };
}

const rail = () => within(screen.getByLabelText('Ferramentas do Composer'));
const toolbar = () => within(screen.getByRole('toolbar', { name: 'Ferramentas do canvas' }));
// Formato e proporção subiram para a barra de cima e viraram dois grupos: eram
// os mesmos controles repetidos em duas fileiras.
const ratioBar = () => within(screen.getByRole('group', { name: 'Proporção' }));

// A barra lateral virou uma só, com oito seções. Camadas mora nela agora — não
// existe mais um segundo painel fixo à direita.
function openTool(label) {
  fireEvent.click(rail().getByRole('button', { name: label }));
}

const layersPanel = () => screen.getByText('CAMADAS').closest('section');

describe('Composer — estado vazio do canvas (§5)', () => {
  it('mostra as três portas de entrada quando não há nada no canvas', () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    const empty = screen.getByTestId('composer-empty-state');
    expect(within(empty).getByText('Comece sua criação')).toBeTruthy();
    expect(within(empty).getByRole('button', { name: /Adicionar mídia/ })).toBeTruthy();
    expect(within(empty).getByRole('button', { name: /Layout/ })).toBeTruthy();
    expect(within(empty).getByRole('button', { name: /Texto/ })).toBeTruthy();
  });

  it('some assim que existe um elemento', () => {
    const draft = draftWith((doc) => addLayer(doc.post, { text: 'Olá' }, [430, 430], 'l1'));
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft} />);
    expect(screen.queryByTestId('composer-empty-state')).toBeNull();
  });

  // "Escrever conteúdo" abria o painel Criar, que sumiu junto com a geração.
  it('"Adicionar mídia" abre o painel de Mídia', () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    openTool('Layout');
    expect(screen.queryByLabelText('Importar mídia')).toBeNull();

    fireEvent.click(within(screen.getByTestId('composer-empty-state')).getByRole('button', { name: /Adicionar mídia/ }));
    expect(screen.getByLabelText('Importar mídia')).toBeTruthy();
  });

  it('"Layout" abre a biblioteca', async () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    fireEvent.click(within(screen.getByTestId('composer-empty-state')).getByRole('button', { name: /^Layout$/ }));
    expect(await screen.findByRole('dialog', { name: /Biblioteca de layouts/ })).toBeTruthy();
  });
});

describe('Composer — toolbar do canvas (§9)', () => {
  const draft = () => draftWith((doc) => {
    addLayer(doc.post, { text: 'Fundo' }, [430, 430], 'l-fundo');
    addLayer(doc.post, { text: 'Título principal' }, [430, 430], 'l-topo');
  });

  // Sem seleção a barra não mostra ação nenhuma: mostrar sete botões cinzas
  // era ruído. Ela passou a dizer o que fazer para que apareçam.
  it('sem seleção, a barra só orienta', () => {
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft()} />);
    expect(toolbar().getByText('Selecione um elemento para editar')).toBeTruthy();
    expect(toolbar().queryByLabelText('Duplicar')).toBeNull();
    expect(toolbar().queryByLabelText('Excluir')).toBeNull();
  });

  it('com seleção, as ações aparecem e a barra identifica o elemento', () => {
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft()} />);
    openTool('Camadas');
    fireEvent.click(within(layersPanel()).getByText('Título principal'));

    expect(toolbar().getByLabelText('Duplicar').disabled).toBe(false);
    expect(toolbar().getByText(/Título principal · 1 de 2/)).toBeTruthy();
  });

  it('trazer para frente e enviar para trás mudam a pilha', async () => {
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft()} />);
    openTool('Camadas');
    fireEvent.click(within(layersPanel()).getByText('Fundo'));
    fireEvent.click(toolbar().getByLabelText('Trazer para frente'));

    // A lista mostra a pilha invertida: quem está na frente encabeça a lista.
    await waitFor(() => {
      const rows = within(layersPanel()).getAllByText(/Fundo|Título principal/);
      expect(rows[0].textContent).toBe('Fundo');
    });
  });

  // Zoom, desfazer e refazer valem para a peça inteira, não para o elemento
  // selecionado: saíram da barra do canvas e subiram para a barra de cima.
  it('o zoom muda pela barra de cima e volta com "Ajustar"', () => {
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft()} />);
    const before = screen.getByTestId('canvas-zoom').textContent;
    fireEvent.click(screen.getByLabelText('Aumentar zoom'));
    expect(screen.getByTestId('canvas-zoom').textContent).not.toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
    expect(screen.getByTestId('canvas-zoom').textContent).toBe(before);
  });

  it('undo só liga quando existe histórico', () => {
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft()} />);
    expect(screen.getByLabelText('Desfazer').disabled).toBe(true);
    expect(screen.getByLabelText('Refazer').disabled).toBe(true);
  });

  it('alinhar posiciona a camada em relação ao canvas', () => {
    const layer = { x: 10, y: 10, w: 100, h: 40 };
    expect(alignedPosition(layer, [430, 430], 'center-h')).toEqual({ x: 165 });
    expect(alignedPosition(layer, [430, 430], 'right')).toEqual({ x: 330 });
    expect(alignedPosition(layer, [430, 430], 'bottom')).toEqual({ y: 390 });
  });
});

describe('Composer — camadas e proporção (§11, §15)', () => {
  it('camadas vazias oferecem os quatro atalhos', () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    openTool('Camadas');
    expect(within(layersPanel()).getByText('Nenhum elemento adicionado')).toBeTruthy();
    for (const label of ['Texto', 'Imagem', 'Forma', 'Emoji']) {
      expect(within(layersPanel()).getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('o atalho de texto cria a camada e o estado vazio some', async () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    openTool('Camadas');
    fireEvent.click(within(layersPanel()).getByRole('button', { name: 'Texto' }));
    await waitFor(() => expect(screen.queryByTestId('composer-empty-state')).toBeNull());
  });

  it('trocar a proporção não apaga elementos', () => {
    const draft = draftWith((doc) => addLayer(doc.post, { text: 'Permanece' }, [430, 430], 'l1'));
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft} />);
    fireEvent.click(ratioBar().getByRole('button', { name: '4:5' }));
    openTool('Camadas');
    expect(within(layersPanel()).getByText('Permanece')).toBeTruthy();
  });
});

describe('Composer — Brand Kit e prévia (§13, §14)', () => {
  // O resumo do Brand Kit vivia grudado no topo da coluna da direita, visível o
  // tempo todo. Ele é configuração, não é a peça: mudou para o painel que o
  // chip da marca abre.
  it('resume a marca no painel que o chip da marca abre', () => {
    render(<VisualComposer brandId="b1" brandName="genkailabs" brandLabel="GenkaiLabs" brandKit={{ visual_style: 'jornalistico', palette: { primary: '#3b82f6', ink: '#0f1317' } }} />);
    expect(screen.queryByText('GenkaiLabs')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '@genkailabs' }));

    expect(screen.getByText('GenkaiLabs')).toBeTruthy();
    expect(screen.getByText('jornalistico')).toBeTruthy();
  });

  it('a prévia é fiel ao enquadramento e avisa que os números são enfeite', () => {
    render(<VisualComposer brandId="b1" brandName="genkailabs" />);
    expect(screen.getByLabelText('Prévia no Instagram')).toBeTruthy();
    expect(screen.getByText(/Prévia fiel ao enquadramento/)).toBeTruthy();
  });

  // A barra de cima passou a ser a dona de formato e proporção, e o chip da
  // marca é quem diz se há Brand Kit — antes isso era uma linha de texto solta.
  it('a barra de cima traz formato, proporção e o estado do Brand Kit', () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    expect(within(screen.getByRole('group', { name: 'Formato' })).getByRole('button', { name: 'Post' })).toBeTruthy();
    expect(ratioBar().getByRole('button', { name: '4:5' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '@marca' }).title).toMatch(/Sem Brand Kit/);
  });
});

describe('Biblioteca: só os layouts salvos (§12)', () => {
  // O catálogo de estruturas saía daqui direto para o motor de geração, que foi
  // removido do Composer de post. Oferecer um card que não monta nada seria
  // pior que não oferecer card nenhum.
  it('lista os layouts salvos da marca e nada do catálogo', () => {
    const items = buildLibraryItems([{ id: 't1', name: 'Meu', category: 'jornalistico', template: { canvas: [430, 430], elements: [] } }]);
    expect(items.length).toBe(1);
    expect(items[0]).toMatchObject({ saved: true, templateId: 't1' });
    expect(items.every((item) => Array.isArray(item.blocks))).toBe(true);
  });

  it('sem layout salvo, a biblioteca fica vazia', () => {
    expect(buildLibraryItems([])).toEqual([]);
  });
});
