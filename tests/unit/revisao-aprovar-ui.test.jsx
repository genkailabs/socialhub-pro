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

  // O servidor roda em UTC. Mandar "2026-09-01T10:00" cru fazia ele ler a hora
  // como UTC e jogar o horário três horas para trás no Brasil — por isso uma
  // data poucos minutos à frente voltava como "essa data já passou".
  it('leva a data escolhida como instante absoluto, no fuso de quem escolheu', async () => {
    render(<ContentReview post={carrossel} />);

    fireEvent.change(screen.getByLabelText('Quando este post sai'), { target: { value: '2026-09-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Aprovar e agendar/ }));

    await waitFor(() => expect(mocks.approveContent).toHaveBeenCalledTimes(1));
    expect(mocks.approveContent.mock.calls[0][0]).toEqual({
      postId: 'post-1',
      scheduledAt: new Date('2026-09-01T10:00').toISOString()
    });
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

  it('o atalho "Sair agora" preenche a hora atual, no fuso de quem está olhando', async () => {
    render(<ContentReview post={carrossel} />);

    fireEvent.click(screen.getByRole('button', { name: /Sair agora/ }));

    const valor = screen.getByLabelText('Quando este post sai').value;
    expect(valor).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const escolhido = new Date(valor).getTime();
    expect(Math.abs(escolhido - Date.now())).toBeLessThan(120_000);

    fireEvent.click(screen.getByRole('button', { name: /Aprovar e agendar/ }));
    await waitFor(() => expect(mocks.approveContent).toHaveBeenCalledTimes(1));
    const enviado = new Date(mocks.approveContent.mock.calls[0][0].scheduledAt).getTime();
    expect(enviado).toBe(new Date(valor).getTime());
    expect(Math.abs(enviado - Date.now())).toBeLessThan(120_000);
  });

  // Alguns minutos à frente no relógio de quem usa precisam continuar no futuro
  // depois da conversão — é exatamente o caso que estava sendo recusado.
  it('uma hora poucos minutos à frente chega ao servidor ainda no futuro', async () => {
    render(<ContentReview post={carrossel} />);

    const daquiTresMin = new Date(Date.now() + 3 * 60 * 1000);
    const dd = (v) => String(v).padStart(2, '0');
    const valor = `${daquiTresMin.getFullYear()}-${dd(daquiTresMin.getMonth() + 1)}-${dd(daquiTresMin.getDate())}`
      + `T${dd(daquiTresMin.getHours())}:${dd(daquiTresMin.getMinutes())}`;

    fireEvent.change(screen.getByLabelText('Quando este post sai'), { target: { value: valor } });
    fireEvent.click(screen.getByRole('button', { name: /Aprovar e agendar/ }));

    await waitFor(() => expect(mocks.approveContent).toHaveBeenCalledTimes(1));
    const enviado = mocks.approveContent.mock.calls[0][0].scheduledAt;
    expect(enviado).toMatch(/Z$/);
    expect(new Date(enviado).getTime()).toBeGreaterThan(Date.now());
  });

  it('post que já tem data não pede data de novo', () => {
    render(<ContentReview post={{ ...carrossel, scheduled_at: '2026-09-01T10:00:00Z' }} />);

    expect(screen.queryByLabelText('Quando este post sai')).toBeNull();
  });
});
