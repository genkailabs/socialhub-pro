import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/approval-actions', () => ({ requestApproval: vi.fn() }));
import { PostDetail } from '@/components/calendar/PostDetail';

beforeAll(() => vi.stubGlobal('React', React));
afterEach(() => cleanup());

// "Gerar link de aprovação" não dizia para quem era o link nem o que ele faz
// com o post — e o produto tem outra aprovação, a interna, com nome parecido.
describe('PostDetail: qual aprovação é esta', () => {
  it('diz que o link é do cliente, sem login, e que trava o post ate a resposta', () => {
    const { container } = render(
      <PostDetail
        post={{ id: 'p-1', status: 'draft', content: 'Peça', production: { source: 'visual-composer' } }}
        onClose={vi.fn()}
      />
    );

    expect(container.textContent).toMatch(/sem login/i);
    expect(screen.getByRole('link', { name: /revisão de conteúdo/i }).getAttribute('href'))
      .toBe('/content/p-1/review');
  });
});

describe('PostDetail scheduled editing', () => {
  it('offers to reopen scheduled visual-composer content without another upload', () => {
    render(
      <PostDetail
        post={{
          id: 'scheduled-1',
          status: 'scheduled',
          content: 'Campanha',
          production: { source: 'visual-composer' }
        }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /editar no composer/i }).getAttribute('href'))
      .toBe('/composer?post=scheduled-1');
  });

  it('dá saída ao rascunho sem data, que é quem precisa ganhar dia e hora', () => {
    render(
      <PostDetail
        post={{ id: 'draft-1', status: 'draft', content: 'Rascunho', production: { source: 'visual-composer' } }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /abrir para agendar/i }).getAttribute('href'))
      .toBe('/composer?post=draft-1');
  });

  // O link levava só o formato. Quem tinha dois carrosséis abria sempre o mais
  // recente, nunca o que clicou — o id precisa viajar junto.
  it('manda o rascunho do Studio de volta pelo formato carrossel, com o id do post', () => {
    render(
      <PostDetail
        post={{ id: 'draft-2', status: 'draft', content: 'Carrossel', production: { source: 'carrossel-studio' } }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /abrir para agendar/i }).getAttribute('href'))
      .toBe('/composer?format=carrossel&post=draft-2');
  });
});
