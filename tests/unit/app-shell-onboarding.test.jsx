import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/layout/AppShell';

vi.mock('@/components/layout/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar">Sidebar</div> }));
vi.mock('@/components/layout/Topbar', () => ({ Topbar: () => <div data-testid="topbar">Topbar</div> }));
vi.mock('@/components/onboarding/guided/GuidedOnboardingWizard', () => ({
  GuidedOnboardingWizard: () => <div data-testid="guided-wizard">GuidedWizard</div>
}));

describe('AppShell onboarding interceptor', () => {
  it('renderiza GuidedWizard em tela cheia sem Sidebar quando onboarding não está concluído', () => {
    const brand = { id: 'brd-1', name: 'Acme', kit: { onboarding_status: 'in_progress' } };
    render(<AppShell brands={[brand]} activeId="brd-1" activeKit={brand.kit}>Conteúdo</AppShell>);
    expect(screen.getByTestId('guided-wizard')).toBeDefined();
    expect(screen.queryByTestId('sidebar')).toBeNull();
  });

  it('renderiza Sidebar, Topbar e children quando onboarding está concluído', () => {
    const brand = { id: 'brd-1', name: 'Acme', kit: { onboarding_status: 'completed' } };
    render(<AppShell brands={[brand]} activeId="brd-1" activeKit={brand.kit}>Conteúdo</AppShell>);
    expect(screen.getByTestId('sidebar')).toBeDefined();
    expect(screen.getByText('Conteúdo')).toBeDefined();
  });
});
