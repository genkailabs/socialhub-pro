import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('@/lib/approval-actions', () => ({ requestApproval: vi.fn() }));
import { CalendarGrid } from '@/components/calendar/CalendarGrid';

beforeAll(() => vi.stubGlobal('React', React));
afterEach(() => cleanup());

const comData = {
  id: 'p1',
  status: 'scheduled',
  content: 'Post agendado',
  scheduled_at: new Date().toISOString()
};
const semData = {
  id: 'p2',
  status: 'draft',
  content: 'Carrossel pronto esperando data',
  scheduled_at: null,
  media_urls: ['https://cdn.test/slide-1.png'],
  production: { source: 'carrossel-studio' }
};

describe('rascunho sem data no Calendário', () => {
  it('mostra quem ainda não tem dia, em vez de sumir com ele', () => {
    render(<CalendarGrid posts={[comData, semData]} />);

    const bloco = screen.getByText('Sem data ainda').closest('div').parentElement.parentElement;
    expect(within(bloco).getByText(/Carrossel pronto esperando data/)).toBeTruthy();
  });

  it('não lista post já agendado nem rascunho excluído', () => {
    render(<CalendarGrid posts={[comData, { ...semData, id: 'p3', deleted_at: '2026-08-01T00:00:00Z' }]} />);

    expect(screen.queryByText('Sem data ainda')).toBeNull();
  });

  it('abre os detalhes ao clicar, que é onde o post ganha data', () => {
    render(<CalendarGrid posts={[semData]} />);

    fireEvent.click(screen.getByText(/Carrossel pronto esperando data/));

    expect(screen.getByRole('link', { name: /abrir para agendar/i })).toBeTruthy();
  });
});
