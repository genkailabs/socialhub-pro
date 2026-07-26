import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, within } from '@testing-library/react';
import { AppShell } from '@/components/layout/AppShell';
import { resolveJourney } from '@/lib/journey';

vi.mock('@/components/layout/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar">Sidebar</div> }));
vi.mock('@/components/layout/Topbar', () => ({ Topbar: () => <div data-testid="topbar">Topbar</div> }));
vi.mock('@/components/journey/AgentWindow', () => ({
  AgentWindow: ({ journey }) => (journey?.conducting ? <div data-testid="agent-window">Agente</div> : null)
}));

const conduzindo = resolveJourney({ hasBrand: true }, { onboarding_status: 'in_progress' });
const concluido = resolveJourney(
  { hasBrand: true, igConnected: true, hasAudit: true, dnaApproved: true, strategyApproved: true, hasPlanItems: true },
  { onboarding_status: 'completed' }
);

function renderShell(journey) {
  const { container } = render(
    <AppShell brands={[{ id: 'brd-1', name: 'Acme' }]} activeId="brd-1" journey={journey}>
      Conteúdo
    </AppShell>
  );
  return within(container);
}

describe('AppShell durante a jornada guiada', () => {
  it('mostra o agente SEM esconder o app: o palco continua sendo a tela real', () => {
    const tela = renderShell(conduzindo);
    expect(tela.getByTestId('agent-window')).toBeDefined();
    // As três asserções que codificam a decisão de produto: menu, topo e a tela
    // continuam ali; o agente só flutua por cima.
    expect(tela.getByTestId('sidebar')).toBeDefined();
    expect(tela.getByTestId('topbar')).toBeDefined();
    expect(tela.getByText('Conteúdo')).toBeDefined();
  });

  it('nao mostra o agente para quem ja terminou', () => {
    const tela = renderShell(concluido);
    expect(tela.queryByTestId('agent-window')).toBeNull();
    expect(tela.getByTestId('sidebar')).toBeDefined();
  });

  it('sem jornada resolvida, o app funciona normalmente', () => {
    const tela = renderShell(null);
    expect(tela.queryByTestId('agent-window')).toBeNull();
    expect(tela.getByText('Conteúdo')).toBeDefined();
  });
});
