// @vitest-environment jsdom
// tests/unit/guided-onboarding-wizard.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import { GuidedOnboardingWizard } from '@/components/onboarding/guided/GuidedOnboardingWizard';

vi.mock('@/lib/onboarding-actions', () => ({
  saveOnboardingProgress: vi.fn(async () => ({ ok: true })),
  completeOnboarding: vi.fn(async () => ({ ok: true }))
}));

vi.mock('@/lib/dna-actions', () => ({
  analyzeBrandDNA: vi.fn(async () => ({ ok: true, version: { id: 'v1' }, dna: { audience: 'Alvo', tone: 'Tom' } })),
  approveDnaVersion: vi.fn(async () => ({ ok: true }))
}));

vi.mock('@/lib/planning-actions', () => ({
  generateWeekPlan: vi.fn(async () => ({ ok: true, count: 5 }))
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('GuidedOnboardingWizard', () => {
  it('renderiza no Passo 0 (Boas-vindas) por padrão quando não há progresso', () => {
    render(React.createElement(GuidedOnboardingWizard, { brandId: "brd-1", brandName: "Acme", kit: {}, connectedPlatforms: {} }));
    expect(screen.getByText('Boas-vindas')).toBeDefined();
    expect(screen.getByText(/inteligência artificial vai preparar/i)).toBeDefined();
  });

  it('permite avançar para o Passo 1 (Conectar Instagram) ao clicar em Começar', () => {
    render(React.createElement(GuidedOnboardingWizard, { brandId: "brd-1", brandName: "Acme", kit: {}, connectedPlatforms: {} }));
    const btn = screen.getByText('Começar configuração automática');
    fireEvent.click(btn);
    expect(screen.getByText('Conectar Instagram')).toBeDefined();
  });
});
