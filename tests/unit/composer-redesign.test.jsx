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
  buildLayoutForContent: vi.fn(),
  generateLayoutFromBrief: vi.fn(),
  getLayoutTemplates: vi.fn(async () => ({ templates: [] })),
  saveLayoutTemplate: vi.fn(),
  deleteLayoutTemplate: vi.fn(),
  renameLayoutTemplate: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';
import { alignedPosition } from '@/components/composer/CanvasToolbar';
import * as GenerationModal from '@/components/composer/GenerationModal';
import { GENERATION_STEPS } from '@/components/composer/GenerationModal';
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
    expect(within(empty).getByRole('button', { name: /Escrever conteúdo/ })).toBeTruthy();
    expect(within(empty).getByRole('button', { name: /Mídia/ })).toBeTruthy();
    expect(within(empty).getByRole('button', { name: /Layout/ })).toBeTruthy();
  });

  it('some assim que existe um elemento', () => {
    const draft = draftWith((doc) => addLayer(doc.post, { text: 'Olá' }, [430, 430], 'l1'));
    render(<VisualComposer brandId="b1" brandName="marca" initialDraft={draft} />);
    expect(screen.queryByTestId('composer-empty-state')).toBeNull();
  });

  // O conteúdo saiu do painel de Layouts e passou a ter seção própria: "Criar".
  // No modo padrão (IA) o primeiro campo é o tema, não o título pronto.
  it('"Escrever conteúdo" abre o painel Criar, que é onde o conteúdo é escrito', () => {
    render(<VisualComposer brandId="b1" brandName="marca" />);
    // Criar abre sozinha; sair dela primeiro é o que faz o teste poder falhar.
    openTool('Mídia');
    expect(screen.queryByLabelText('Tema')).toBeNull();

    fireEvent.click(within(screen.getByTestId('composer-empty-state')).getByRole('button', { name: /Escrever conteúdo/ }));
    expect(screen.getByLabelText('Tema')).toBeTruthy();
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

describe('Geração: descreve o trabalho sem medir o que não mede (§7)', () => {
  // O backend não emite progresso. As etapas descrevem o que a geração faz; não
  // existe mais porcentagem nem etapa "concluída" avançando por timer.
  it('lista as etapas sem expor progresso numérico', () => {
    expect(GENERATION_STEPS.length).toBeGreaterThan(0);
    expect(GenerationModal.generationProgress).toBeUndefined();
    expect(GenerationModal.GENERATION_STALL_STEP).toBeUndefined();
  });
});

describe('Biblioteca: catálogo interno + salvos, sem segunda estrutura no banco (§12)', () => {
  it('junta os layouts salvos da marca com as estruturas padrão', () => {
    const items = buildLibraryItems([{ id: 't1', name: 'Meu', category: 'jornalistico', template: { canvas: [430, 430], elements: [] } }]);
    expect(items[0]).toMatchObject({ saved: true, templateId: 't1' });
    expect(items.filter((item) => !item.saved).length).toBeGreaterThan(5);
    expect(items.every((item) => Array.isArray(item.blocks))).toBe(true);
  });

  // PRD 02 §11: o card mostra o que a peça exige. A ficha só existe para as
  // estruturas do catálogo — layout salvo não tem contrato para derivar dela,
  // e é isso que faz o filtro de foto escondê-lo em vez de mostrá-lo sem
  // atender ao que foi pedido.
  it('anexa a ficha as estruturas do catalogo, e nao aos layouts salvos', () => {
    const items = buildLibraryItems([{ id: 't1', name: 'Meu', category: 'jornalistico', template: { canvas: [430, 430], elements: [] } }]);
    const salvo = items.find((item) => item.saved);
    const catalogo = items.filter((item) => !item.saved);

    expect(salvo.card).toBeUndefined();
    for (const item of catalogo) {
      expect(item.card, item.name).toBeTruthy();
      expect(typeof item.card.needsPhoto, item.name).toBe('boolean');
      expect(['pouco', 'medio', 'muito'], item.name).toContain(item.card.textLevel);
      expect(item.card.recommendedFor, item.name).toBeTruthy();
    }
    // Os templates de alto impacto entraram e pedem foto.
    const hero = catalogo.find((item) => item.structureId === 'hero-editorial');
    expect(hero.card.needsPhoto).toBe(true);
    const pessoa = catalogo.find((item) => item.structureId === 'manchete-pessoa');
    expect(pessoa.card.withPerson).toBe(true);
  });
});
