import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const actions = vi.hoisted(() => ({
  prepareDailyContent: vi.fn(),
  approveDailyContent: vi.fn(),
  scheduleDailyContent: vi.fn()
}));

vi.mock('@/lib/daily-content-actions', () => actions);
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ remove: vi.fn() }) } })
}));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/lib/posts-actions', () => ({
  publishNow: vi.fn(), saveDraft: vi.fn(), schedulePost: vi.fn(), deleteComposerDraft: vi.fn()
}));

import { DailyContentBrief, dailyPackageToComposerDraft } from '@/components/composer/DailyContentBrief';
import { VisualComposer } from '@/components/composer/VisualComposer';
import { dailyContentDateInSaoPaulo } from '@/lib/daily-content-date';

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

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

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

  it('never hydrates a static daily image as Reel media', () => {
    const draft = dailyPackageToComposerDraft({ ...readyPackage, format: 'Reel' });

    expect(draft).toBeNull();
  });

  it('explains that a static daily asset cannot be edited as a fake Reel', () => {
    render(<DailyContentBrief
      brandId="brand-1"
      contentDate="2026-07-26"
      package={{ ...readyPackage, format: 'Reel' }}
    />);

    expect(screen.getByText(/reels precisam de um v.deo real/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Editar' })).toBeNull();
  });

  it('apresenta um pacote interno com a proveniencia aprovada mesmo sem link externo', () => {
    render(<DailyContentBrief
      brandId="brand-1"
      contentDate="2026-07-26"
      package={{ ...readyPackage, sources: [], evidence: { kind: 'internal', source: 'approved-context' } }}
    />);

    expect(screen.getByText(/contexto aprovado/i)).toBeTruthy();
    expect(screen.getByText(/contexto editorial aprovado da marca/i)).toBeTruthy();
    expect(document.body.textContent).not.toContain('approved-context');
  });

  it('explica pelo Hub por que o tema foi selecionado', () => {
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={readyPackage} />);

    expect(screen.getByText(new RegExp(`O Hub selecionou este tema porque ${readyPackage.reason}`, 'i'))).toBeTruthy();
  });

  it.each([
    ['approved-calendar', /calend.rio editorial aprovado/i],
    ['contextual-opportunity', /estrat.gia aprovada.*contexto da marca/i],
    ['unmapped-internal-code', /contexto aprovado da marca/i]
  ])('translates stored reason code %s into a human Hub explanation', (reason, explanation) => {
    const { container } = render(<DailyContentBrief
      brandId="brand-1"
      contentDate="2026-07-26"
      package={{ ...readyPackage, reason, evidence: { kind: 'internal', source: reason } }}
    />);

    expect(screen.getAllByText(explanation).length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain(reason);
  });

  it('mantem a decisao acessivel antes de uma legenda longa e revela o restante sob demanda', () => {
    const longCaption = `${'Introducao '.repeat(70)}TRECHO FINAL DA LEGENDA`;
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={{ ...readyPackage, generated_content: { ...readyPackage.generated_content, caption: longCaption } }} />);

    const reveal = screen.getByRole('button', { name: /ler legenda completa/i });
    const approve = screen.getByRole('button', { name: 'Aprovar' });
    expect(reveal.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/TRECHO FINAL DA LEGENDA/)).toBeNull();
    fireEvent.click(reveal);
    expect(screen.getByText(/TRECHO FINAL DA LEGENDA/)).toBeTruthy();
  });

  it('renderiza uma unica mensagem acessivel quando a consulta do pacote esta indisponivel', () => {
    render(<DailyContentBrief brandId="brand-1" contentDate="2026-07-26" package={null} unavailableMessage="A consulta falhou." />);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('identifica o pacote injetado como conteudo ainda nao salvo no Composer', () => {
    const draft = dailyPackageToComposerDraft(readyPackage);
    render(<VisualComposer brandId="brand-1" brandName="Marca" initialDraft={draft} />);

    expect(screen.getByText('Conteúdo do dia carregado')).toBeTruthy();
    expect(screen.queryByText('Rascunho salvo')).toBeNull();
  });

  it('calcula a data diaria no fuso de Sao Paulo, inclusive perto da meia-noite UTC', () => {
    expect(dailyContentDateInSaoPaulo(new Date('2026-07-27T01:30:00.000Z'))).toBe('2026-07-26');
    expect(dailyContentDateInSaoPaulo(new Date('2026-07-27T03:30:00.000Z'))).toBe('2026-07-27');
  });
});
