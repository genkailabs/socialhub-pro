import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/lib/approval-actions', () => ({ requestApproval: vi.fn() }));
import { PostDetail } from '@/components/calendar/PostDetail';

beforeAll(() => vi.stubGlobal('React', React));
afterEach(() => cleanup());

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

  it('manda o rascunho do Studio de volta pelo formato carrossel', () => {
    render(
      <PostDetail
        post={{ id: 'draft-2', status: 'draft', content: 'Carrossel', production: { source: 'carrossel-studio' } }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /abrir para agendar/i }).getAttribute('href'))
      .toBe('/composer?format=carrossel');
  });
});
