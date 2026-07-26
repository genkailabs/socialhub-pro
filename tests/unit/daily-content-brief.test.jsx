import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const actions = vi.hoisted(() => ({
  prepareDailyContent: vi.fn(),
  approveDailyContent: vi.fn(),
  scheduleDailyContent: vi.fn()
}));

vi.mock('@/lib/daily-content-actions', () => actions);

import { DailyContentBrief, dailyPackageToComposerDraft } from '@/components/composer/DailyContentBrief';

const readyPackage = {
  id: 'package-1',
  status: 'ready',
  topic: 'Como organizar o calendario editorial',
  goal: 'educar',
  format: 'Post',
  reason: 'Tema aprovado na estrategia semanal.',
  generated_content: {
    caption: 'Uma legenda pronta para ajustar.',
    hashtags: ['#planejamento', '#marketing'],
    firstComment: 'Salve este post para consultar depois.',
    headline: 'Planejamento que funciona'
  },
  media_urls: ['https://cdn.example/arte-gerada.png'],
  alt_text: 'Calendario editorial azul com anotacoes.',
  recommended_schedule: { weekday: 1, time: '12:00', source: 'measured' },
  sources: [{ title: 'Relatorio oficial', publisher: 'Meta', url: 'https://about.meta.com/report' }]
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DailyContentBrief', () => {
  it('apresenta o pacote pronto com entregaveis, acoes e fonte verificavel', () => {
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={readyPackage} />);

    expect(screen.getByRole('heading', { name: /conteúdo de hoje/i })).toBeTruthy();
    expect(screen.getByText(readyPackage.topic)).toBeTruthy();
    expect(screen.getByText(readyPackage.reason)).toBeTruthy();
    expect(screen.getByText(readyPackage.generated_content.caption)).toBeTruthy();
    expect(screen.getByText('#planejamento #marketing')).toBeTruthy();
    expect(screen.getByText(readyPackage.alt_text)).toBeTruthy();
    expect(screen.getByText(/segunda.*12:00/i)).toBeTruthy();
    expect(screen.getByAltText(readyPackage.alt_text).getAttribute('src')).toBe(readyPackage.media_urls[0]);
    expect(screen.getByText('Arte gerada por IA')).toBeTruthy();
    expect(screen.getByRole('link', { name: /meta.*relatorio oficial/i }).getAttribute('href')).toBe(readyPackage.sources[0].url);
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe('/composer?daily=package-1');
    expect(screen.getByRole('button', { name: 'Agendar' }).disabled).toBe(true);
  });

  it('mostra uma explicacao de preparo quando nao ha pacote para hoje', () => {
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={null} />);

    expect(screen.getByText(/ainda não há um pacote preparado/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /preparar conteúdo/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
  });

  it('prepara o conteudo e atualiza o painel com a resposta da action', async () => {
    actions.prepareDailyContent.mockResolvedValue({ ok: true, package: readyPackage });
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={null} />);

    fireEvent.click(screen.getByRole('button', { name: /preparar conteúdo/i }));

    await waitFor(() => expect(actions.prepareDailyContent).toHaveBeenCalledWith({ brandId: 'brand-1', contentDate: '2026-07-26' }));
    expect(await screen.findByText(readyPackage.topic)).toBeTruthy();
  });

  it('anuncia falha ao preparar quando a action nao devolve um pacote utilizavel', async () => {
    actions.prepareDailyContent.mockResolvedValue({ error: 'Fontes verificadas indisponiveis.', code: 'research_unavailable' });
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={null} />);

    fireEvent.click(screen.getByRole('button', { name: /preparar conteúdo/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Fontes verificadas indisponiveis.');
    expect(screen.getByRole('button', { name: /preparar conteúdo/i })).toBeTruthy();
  });

  it('aprova somente um pacote pronto e libera o agendamento', async () => {
    actions.approveDailyContent.mockResolvedValue({ ok: true, package: { ...readyPackage, status: 'approved' } });
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={readyPackage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => expect(actions.approveDailyContent).toHaveBeenCalledWith({ packageId: readyPackage.id }));
    expect(await screen.findByText(/aprovado; escolha quando agendar/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agendar' }).disabled).toBe(false);
  });

  it('exige uma data futura e chama o agendamento apenas depois da aprovacao', async () => {
    const approvedPackage = { ...readyPackage, status: 'approved' };
    actions.scheduleDailyContent.mockResolvedValue({ ok: true, package: { ...approvedPackage, status: 'scheduled', scheduled_at: '2099-12-31T12:00:00.000Z' } });
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={approvedPackage} />);

    fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(screen.getByRole('alert').textContent).toMatch(/informe uma data futura/i);
    expect(actions.scheduleDailyContent).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/data e hora/i), { target: { value: '2099-12-31T12:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    await waitFor(() => expect(actions.scheduleDailyContent).toHaveBeenCalledWith({
      packageId: readyPackage.id,
      scheduledAt: new Date('2099-12-31T12:00').toISOString()
    }));
  });

  it('mostra o erro de estado indisponivel sem chamar uma action ausente', () => {
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={{ ...readyPackage, status: 'failed', failure_message: 'A pesquisa nao foi validada.' }} />);

    expect(screen.getByRole('alert').textContent).toContain('A pesquisa nao foi validada.');
    expect(screen.getByRole('button', { name: /preparar conteúdo/i })).toBeTruthy();
    expect(actions.approveDailyContent).not.toHaveBeenCalled();
  });

  it('adapta texto e midia do pacote para o composer sem criar um post', () => {
    const draft = dailyPackageToComposerDraft(readyPackage);

    expect(draft.id).toBeNull();
    expect(draft.status).toBe('draft');
    expect(draft.editor_state.caption).toBe(readyPackage.generated_content.caption);
    expect(draft.editor_state.hashtags).toBe('#planejamento #marketing');
    expect(draft.editor_state.altText).toBe(readyPackage.alt_text);
    expect(draft.editor_state.doc.post.media.url).toBe(readyPackage.media_urls[0]);
  });
});
