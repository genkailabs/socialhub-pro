import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const actions = vi.hoisted(() => ({
  buildLayoutForContent: vi.fn(),
  generateLayoutFromBrief: vi.fn(),
  getLayoutTemplates: vi.fn(),
  saveLayoutTemplate: vi.fn(),
  deleteLayoutTemplate: vi.fn()
}));

vi.mock('@/lib/layout-actions', () => actions);

import { LayoutsPanel } from '@/components/composer/LayoutsPanel';

const surface = {
  media: null,
  bg: { x: 0, y: 0, scale: 1, rot: 0 },
  layers: [{ id: 'a', type: 'text', text: 'oi', x: 1, y: 1, w: 10, h: 10 }]
};

beforeAll(() => { vi.stubGlobal('React', React); });

beforeEach(() => {
  for (const fn of Object.values(actions)) fn.mockReset();
  actions.getLayoutTemplates.mockResolvedValue({ templates: [] });
});

afterEach(cleanup);

function setup(props = {}) {
  const onApplySurfaces = vi.fn();
  render(
    <LayoutsPanel
      brandId="brand-1"
      brandName="genkailabs"
      format="post"
      ratio="1:1"
      canvas={[430, 430]}
      surface={surface}
      caption=""
      onApplySurfaces={onApplySurfaces}
      {...props}
    />
  );
  return { onApplySurfaces };
}

const montar = () => fireEvent.click(screen.getByRole('button', { name: /Montar arte/ }));

describe('painel de Layouts', () => {
  it('oferece escolha automática e as opções manuais do §17', () => {
    setup();
    expect(screen.getByRole('option', { name: 'A IA escolhe pelo conteúdo' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'A IA escolhe pela marca' })).toBeTruthy();
    expect(screen.getByLabelText('Estrutura').querySelectorAll('option')).toHaveLength(13);
    expect(screen.getByLabelText('Estilo visual').querySelectorAll('option')).toHaveLength(9);
  });

  it('não monta sem título e diz o porquê', async () => {
    setup();
    montar();
    expect((await screen.findByRole('alert')).textContent).toMatch(/título/);
    expect(actions.buildLayoutForContent).not.toHaveBeenCalled();
  });

  it('monta a peça e entrega as camadas ao Composer (§16)', async () => {
    actions.buildLayoutForContent.mockResolvedValue({
      ok: true,
      slides: [{ surface: { media: null, bg: {}, layers: [{ id: 'x' }] } }],
      mascot: ['Este conteúdo é uma notícia.'],
      issues: []
    });
    const { onApplySurfaces } = setup();
    fireEvent.change(screen.getByLabelText('Título da arte'), { target: { value: 'Nova regra do imposto' } });
    montar();

    await waitFor(() => expect(onApplySurfaces).toHaveBeenCalledTimes(1));
    expect(onApplySurfaces.mock.calls[0][0][0].layers).toHaveLength(1);
    expect(actions.buildLayoutForContent.mock.calls[0][0].content.title).toBe('Nova regra do imposto');
    expect(actions.buildLayoutForContent.mock.calls[0][0].structureId).toBeNull();
  });

  it('repassa a escolha manual de estrutura e estilo', async () => {
    actions.buildLayoutForContent.mockResolvedValue({ ok: true, slides: [{ surface }], mascot: [], issues: [] });
    setup();
    fireEvent.change(screen.getByLabelText('Título da arte'), { target: { value: 'Titulo' } });
    fireEvent.change(screen.getByLabelText('Estrutura'), { target: { value: 'citacao' } });
    fireEvent.change(screen.getByLabelText('Estilo visual'), { target: { value: 'premium' } });
    montar();
    await waitFor(() => expect(actions.buildLayoutForContent).toHaveBeenCalled());
    expect(actions.buildLayoutForContent.mock.calls[0][0].structureId).toBe('citacao');
    expect(actions.buildLayoutForContent.mock.calls[0][0].styleId).toBe('premium');
  });

  it('mostra a explicação do mascote (§15)', async () => {
    actions.buildLayoutForContent.mockResolvedValue({
      ok: true,
      slides: [{ surface }],
      mascot: ['Escolhi a estrutura "Manchete" porque valoriza o título.'],
      issues: []
    });
    setup();
    fireEvent.change(screen.getByLabelText('Título da arte'), { target: { value: 'Titulo' } });
    montar();
    expect(await screen.findByText(/Escolhi a estrutura "Manchete"/)).toBeTruthy();
  });

  it('mostra o que ainda precisa do usuário quando a validação não fecha (§14)', async () => {
    actions.buildLayoutForContent.mockResolvedValue({
      ok: false,
      slides: [{ surface }],
      mascot: [],
      issues: [{ id: 'cta_ausente', message: 'A peça exige chamada para ação.', fix: 'Adicionar um CTA curto.' }]
    });
    setup();
    fireEvent.change(screen.getByLabelText('Título da arte'), { target: { value: 'Titulo' } });
    montar();
    expect(await screen.findByText(/chamada para ação/)).toBeTruthy();
  });

  it('preenche os campos a partir da legenda existente', () => {
    setup({ caption: 'Primeira linha do post\nSegunda linha explicando' });
    fireEvent.click(screen.getByRole('button', { name: /Preencher com a legenda/ }));
    expect(screen.getByLabelText('Título da arte').value).toBe('Primeira linha do post');
    expect(screen.getByLabelText('Texto de apoio').value).toBe('Segunda linha explicando');
  });

  it('salva a peça atual como layout (§11)', async () => {
    actions.saveLayoutTemplate.mockResolvedValue({
      ok: true, template: { id: 't1', name: 'Meu layout', template: { elements: [] } }
    });
    setup();
    fireEvent.change(screen.getByLabelText('Nome do layout'), { target: { value: 'Meu layout' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar peça atual como layout/ }));
    await waitFor(() => expect(actions.saveLayoutTemplate).toHaveBeenCalled());
    expect(actions.saveLayoutTemplate.mock.calls[0][0].name).toBe('Meu layout');
    expect(await screen.findByRole('button', { name: 'Meu layout' })).toBeTruthy();
  });

  it('exige nome antes de salvar o layout', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Salvar peça atual como layout/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/nome/);
    expect(actions.saveLayoutTemplate).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor em vez de fingir que deu certo', async () => {
    actions.buildLayoutForContent.mockResolvedValue({ error: 'Sessão expirada.' });
    const { onApplySurfaces } = setup();
    fireEvent.change(screen.getByLabelText('Título da arte'), { target: { value: 'Titulo' } });
    montar();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Sessão expirada/);
    expect(onApplySurfaces).not.toHaveBeenCalled();
  });

  it('aplica um layout salvo sem ida ao servidor', async () => {
    actions.getLayoutTemplates.mockResolvedValue({
      templates: [{
        id: 't1', name: 'Manchete da marca', format: 'post', ratio: '1:1',
        template: {
          version: 1, canvas: [430, 430], elements: [
            { id: 'e1', componentId: 'titulo', behavior: 'dynamic', sample: 'Exemplo', layer: { type: 'text', text: 'Exemplo', x: 10, y: 10, w: 200, h: 40, fs: 24 } }
          ]
        }
      }]
    });
    const { onApplySurfaces } = setup();
    const botao = await screen.findByRole('button', { name: 'Manchete da marca' });
    fireEvent.change(screen.getByLabelText('Título da arte'), { target: { value: 'Assunto novo' } });
    fireEvent.click(botao);
    expect(onApplySurfaces).toHaveBeenCalledTimes(1);
    expect(onApplySurfaces.mock.calls[0][0][0].layers[0].text).toBe('Assunto novo');
  });
});
