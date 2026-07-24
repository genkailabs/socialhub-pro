import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));

import { VisualComposer } from '@/components/composer/VisualComposer';
import { addLayer, makeComposerDocument } from '@/lib/composer-editor';
import { iconLayerPreset } from '@/data/element-icons';
import { ELEMENT_VECTOR_ICONS } from '@/data/element-icons';

const ELEMENT_DRAG_TYPE = 'application/x-socialhub-element';
const LAYER_DRAG_TYPE = 'application/x-socialhub-layer';

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

function dataTransfer(store = {}) {
  return {
    effectAllowed: '',
    dropEffect: '',
    types: Object.keys(store),
    setData: (type, value) => { store[type] = value; },
    getData: (type) => store[type] || ''
  };
}

function rowOf(label) {
  const panel = screen.getByText('CAMADAS').closest('aside');
  return within(panel).getByText(label).closest('div[draggable]');
}

describe('Composer — edição de texto no canvas (§2.1, §2.2)', () => {
  it('duplo clique edita o texto sem barra flutuante e Esc finaliza preservando o conteúdo', async () => {
    const draft = draftWith((doc) => addLayer(doc.post, { text: 'Título', w: 180, h: 48 }, [430, 430], 'texto-1'));
    render(<VisualComposer brandId="brand-1" brandName="Marca" initialDraft={draft} />);

    fireEvent.doubleClick(screen.getAllByText('Título')[0]);
    const editor = await screen.findByLabelText('Editar texto da camada');
    expect(editor.value).toBe('Título');
    expect(screen.queryByLabelText('Opacidade')).toBeNull();
    expect(window.getComputedStyle(editor).overflow).toBe('hidden');

    fireEvent.change(editor, { target: { value: 'Título\nem duas linhas' } });
    fireEvent.keyDown(editor, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByLabelText('Editar texto da camada')).toBeNull());
    expect(screen.getAllByText(/em duas linhas/)[0]).toBeTruthy();
  });
});

describe('Composer — painel de camadas (§2.3, §2.4)', () => {
  it('lista mídia, texto, forma, linha, seta, ícone e emoji', () => {
    const icon = ELEMENT_VECTOR_ICONS[0];
    const draft = draftWith((doc) => {
      doc.post.media = { url: 'https://cdn/post.png', kind: 'image', name: 'foto.png', width: 800, height: 800 };
      addLayer(doc.post, { text: 'Chamada' }, [430, 430], 'l-text');
      addLayer(doc.post, { type: 'shape', shape: 'rect', text: '' }, [430, 430], 'l-shape');
      addLayer(doc.post, { type: 'line', text: '' }, [430, 430], 'l-line');
      addLayer(doc.post, { type: 'arrow', text: '' }, [430, 430], 'l-arrow');
      addLayer(doc.post, iconLayerPreset(icon), [430, 430], 'l-icon');
      addLayer(doc.post, { type: 'sticker', text: '🍕' }, [430, 430], 'l-emoji');
    });
    render(<VisualComposer brandId="brand-1" brandName="Marca" initialDraft={draft} />);

    for (const label of ['foto.png', 'Chamada', 'Forma', 'Linha', 'Seta', icon.label, 'Emoji 🍕']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByLabelText('Selecionar camada Imagem')).toBeTruthy();
  });

  it('arrastar uma camada muda a ordem da pilha', async () => {
    const draft = draftWith((doc) => {
      addLayer(doc.post, { text: 'Fundo' }, [430, 430], 'l-fundo');
      addLayer(doc.post, { text: 'Topo' }, [430, 430], 'l-topo');
    });
    render(<VisualComposer brandId="brand-1" brandName="Marca" initialDraft={draft} />);

    // A lista mostra a pilha invertida: "Topo" começa na frente.
    expect(within(rowOf('Topo')).getByLabelText('Trazer para frente').disabled).toBe(true);

    const transfer = dataTransfer();
    fireEvent.dragStart(rowOf('Topo'), { dataTransfer: transfer });
    fireEvent.dragOver(rowOf('Fundo'), { dataTransfer: transfer });
    fireEvent.drop(rowOf('Fundo'), { dataTransfer: transfer });

    await waitFor(() => expect(within(rowOf('Fundo')).getByLabelText('Trazer para frente').disabled).toBe(true));
    expect(within(rowOf('Topo')).getByLabelText('Enviar para trás').disabled).toBe(true);
  });
});

describe('Composer — arrastar da biblioteca para o canvas (§2.7)', () => {
  it('soltar no canvas cria a camada e ela aparece no painel de camadas', async () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    fireEvent.click(screen.getByRole('button', { name: 'Elementos' }));

    const transfer = dataTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: 'Retângulo' }), { dataTransfer: transfer });
    expect(transfer.getData(ELEMENT_DRAG_TYPE)).toContain('shape');

    fireEvent.drop(screen.getByTestId('composer-canvas'), { dataTransfer: transfer, clientX: 120, clientY: 90 });

    await waitFor(() => expect(screen.getByText('Forma')).toBeTruthy());
  });

  it('soltar um payload de outro tipo não cria camada', () => {
    render(<VisualComposer brandId="brand-1" brandName="Marca" />);
    fireEvent.drop(screen.getByTestId('composer-canvas'), {
      dataTransfer: dataTransfer({ [LAYER_DRAG_TYPE]: 'l-1' }),
      clientX: 120,
      clientY: 90
    });
    expect(screen.getByText('Adicione textos, formas ou figurinhas ao canvas.')).toBeTruthy();
  });
});
