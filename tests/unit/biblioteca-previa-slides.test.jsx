import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LibraryGrid } from '@/components/biblioteca/LibraryGrid';

// A grade mostra só a capa, e capa não prova nada: foi olhando apenas a capa
// que a biblioteca anterior passou por sete layouts diferentes sendo o mesmo.
// O que este arquivo cobre é o caminho de ver o miolo sem abrir o Studio.

afterEach(cleanup);

const OBJETIVOS = [{ id: 'descoberta', label: 'Descoberta', resumo: 'Alcança quem não te segue.' }];

function card(extra = {}) {
  return {
    kind: 'template',
    id: 'template:palavra-marcada',
    name: 'Palavra Marcada',
    blurb: 'Sem foto: manchete gigante.',
    reference: 'Carrossel 01, slides 3 e 8 (P1 + P9)',
    funnelStage: 'Topo',
    objetivos: ['descoberta'],
    format: 'carrossel',
    href: '/composer?template=palavra-marcada',
    previewUrl: 'http://studio/templates/palavra-marcada.png',
    previewSlides: [
      'http://studio/templates/palavra-marcada.png',
      'http://studio/templates/palavra-marcada--2.png',
      'http://studio/templates/palavra-marcada--3.png',
      'http://studio/templates/palavra-marcada--4.png',
      'http://studio/templates/palavra-marcada--5.png'
    ],
    ...extra
  };
}

function abrirPrevia(cards = [card()]) {
  render(<LibraryGrid cards={cards} objetivos={OBJETIVOS} />);
  fireEvent.click(screen.getByLabelText('Ver os slides de Palavra Marcada'));
  return screen.getByRole('dialog');
}

describe('prévia dos slides na Biblioteca', () => {
  it('abre com capa, miolo e fecho — e começa na capa', () => {
    const dialog = abrirPrevia();
    expect(within(dialog).getByText('Palavra Marcada')).toBeTruthy();
    expect(within(dialog).getByAltText(/— Capa$/)).toBeTruthy();
    expect(within(dialog).getByAltText(/— Miolo 2$/)).toBeTruthy();
    expect(within(dialog).getByAltText(/— Fecho$/)).toBeTruthy();
    expect(within(dialog).getByText(/1 de 5/)).toBeTruthy();
  });

  it('avança e volta pelos slides', () => {
    const dialog = abrirPrevia();
    fireEvent.click(within(dialog).getByLabelText('Próximo slide'));
    expect(within(dialog).getByText(/2 de 5/)).toBeTruthy();
    expect(within(dialog).getByText('Miolo 1')).toBeTruthy();

    fireEvent.click(within(dialog).getByLabelText('Slide anterior'));
    expect(within(dialog).getByText(/1 de 5/)).toBeTruthy();
  });

  it('salta direto pelo marcador do slide', () => {
    const dialog = abrirPrevia();
    fireEvent.click(within(dialog).getByLabelText('Fecho'));
    expect(within(dialog).getByText(/5 de 5/)).toBeTruthy();
  });

  it('diz que a prévia está fora quando o Studio não respondeu', () => {
    // Sem prévia o layout continua utilizável: some a imagem, não o caminho.
    const dialog = abrirPrevia([card({ previewUrl: null, previewSlides: [] })]);
    expect(within(dialog).getByText(/não respondeu agora/)).toBeTruthy();
    expect(within(dialog).getByText('Usar este layout')).toBeTruthy();
  });

  it('layout salvo pela pessoa não abre prévia de slides', () => {
    // Layout salvo é forma de uma peça, não um carrossel: não existe miolo
    // para mostrar, e um modal vazio seria pior que botão nenhum.
    render(
      <LibraryGrid
        cards={[{ kind: 'layout', id: 'layout:1', name: 'Meu layout', blurb: 'Salvo por você', blocks: [], objetivos: [], href: '/composer?layout=1' }]}
        objetivos={OBJETIVOS}
      />
    );
    expect(screen.queryByLabelText(/Ver os slides/)).toBeNull();
  });
});
