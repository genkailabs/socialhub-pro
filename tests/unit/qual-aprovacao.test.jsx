import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { QualAprovacao } from '@/components/approvals/QualAprovacao';

beforeAll(() => vi.stubGlobal('React', React));
afterEach(() => cleanup());

describe('QualAprovacao', () => {
  // O relato foi "aprovações confuso": as duas coisas se chamam aprovação e a
  // tela nunca dizia que eram duas. O conserto é a tela nomear as duas juntas.
  it('nomeia os dois sistemas na mesma tela, sempre', () => {
    render(<QualAprovacao atual="cliente" />);

    expect(screen.getByText(/revisão de conteúdo/i)).toBeTruthy();
    expect(screen.getByText(/aprovação do cliente/i)).toBeTruthy();
  });

  it('marca qual dos dois é a tela em que a pessoa está', () => {
    render(<QualAprovacao atual="cliente" />);

    expect(screen.getByText('Você está aqui')).toBeTruthy();
  });

  it('leva para o outro sistema em vez de deixar a pessoa procurar', () => {
    render(<QualAprovacao atual="interna" postId="post-9" />);

    expect(screen.getByRole('link', { name: /aprovação do cliente/i }).getAttribute('href'))
      .toBe('/calendar');
  });

  // Sem post aberto (a lista de /approvals), o atalho para a revisão nao tem
  // para onde apontar: melhor nao mostrar link nenhum do que um link quebrado.
  it('omite o atalho da revisão quando não há post em mãos', () => {
    render(<QualAprovacao atual="cliente" />);

    expect(screen.queryByRole('link', { name: /revisão de conteúdo/i })).toBeNull();
  });

  it('aponta para a revisão do post quando há um post em mãos', () => {
    render(<QualAprovacao atual="cliente" postId="post-9" />);

    expect(screen.getByRole('link', { name: /revisão de conteúdo/i }).getAttribute('href'))
      .toBe('/content/post-9/review');
  });

  it('diz o que distingue os dois: quem decide e se precisa de login', () => {
    const { container } = render(<QualAprovacao atual="interna" />);
    const texto = container.textContent;

    expect(texto).toMatch(/você/i);
    expect(texto).toMatch(/cliente/i);
    expect(texto).toMatch(/sem login/i);
  });
});
