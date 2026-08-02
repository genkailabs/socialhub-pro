import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  approveContent: vi.fn(async () => ({ ok: true, status: 'scheduled' })),
  updateContent: vi.fn(async () => ({ ok: true })),
  markPostedManually: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn()
}));

vi.mock('@/lib/content-actions', () => ({
  approveContent: mocks.approveContent,
  updateContent: mocks.updateContent,
  markPostedManually: mocks.markPostedManually
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));

import { ContentReview } from '@/components/content/ContentReview';

beforeAll(() => vi.stubGlobal('React', React));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const carrossel = {
  id: 'post-1',
  format: 'carousel',
  status: 'draft',
  content: 'Legenda do carrossel',
  scheduled_at: null,
  media_urls: ['https://cdn.test/1.png', 'https://cdn.test/2.png'],
  production: { source: 'carrossel-studio' }
};

describe('revisar e aprovar o carrossel que veio do Studio', () => {
  it('pede o dia e a hora quando o post ainda não tem data', () => {
    render(<ContentReview post={carrossel} />);

    expect(screen.getByLabelText('Quando este post sai')).toBeTruthy();
    expect(screen.getByText(/não é publicado nem aparece na grade/)).toBeTruthy();
  });

  it('leva a data escolhida junto da aprovação e volta para o Calendário', async () => {
    render(<ContentReview post={carrossel} />);

    fireEvent.change(screen.getByLabelText('Quando este post sai'), { target: { value: '2026-09-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Aprovar e agendar/ }));

    await waitFor(() => expect(mocks.approveContent).toHaveBeenCalledTimes(1));
    expect(mocks.approveContent.mock.calls[0][0]).toEqual({ postId: 'post-1', scheduledAt: '2026-09-01T10:00' });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/calendar'));
  });

  it('salva a legenda editada antes de aprovar, sem exigir dois cliques', async () => {
    render(<ContentReview post={carrossel} />);

    fireEvent.change(screen.getByLabelText('Legenda'), { target: { value: 'Legenda nova' } });
    fireEvent.change(screen.getByLabelText('Quando este post sai'), { target: { value: '2026-09-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Aprovar e agendar/ }));

    await waitFor(() => expect(mocks.updateContent).toHaveBeenCalledTimes(1));
    expect(mocks.updateContent.mock.calls[0][0].patch).toEqual({ content: 'Legenda nova' });
  });

  it('oferece a saída de não aprovar, sem mexer no rascunho', () => {
    render(<ContentReview post={carrossel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ainda não' }));

    expect(mocks.approveContent).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/calendar');
  });

  it('post que já tem data não pede data de novo', () => {
    render(<ContentReview post={{ ...carrossel, scheduled_at: '2026-09-01T10:00:00Z' }} />);

    expect(screen.queryByLabelText('Quando este post sai')).toBeNull();
  });
});
