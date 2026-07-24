import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { BrandKitShell } from '@/components/brand-kit/BrandKitShell';

afterEach(() => cleanup());

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/brand-kit/BrandKitTabs', () => ({
  BrandKitTabs: () => <div data-testid="simple-brand-kit-dashboard">Dashboard</div>,
}));

describe('BrandKitShell — modo simples', () => {
  it('exibe o resumo de saúde e não exibe ações técnicas do onboarding', () => {
    render(<BrandKitShell brandId="brd-1" brandName="Acme" brandColor="#007AFF" kit={{ onboarding_status: 'completed', updated_at: '2026-07-18T12:00:00Z' }} />);

    expect(screen.getByText('Brand Kit atualizado')).toBeDefined();
    expect(screen.getByText('18/07/2026')).toBeDefined();
    expect(screen.queryByText(/Refazer onboarding guiado/i)).toBeNull();
    expect(screen.queryByText(/Nova versão do seu Brand DNA pronta/i)).toBeNull();
    expect(screen.getByTestId('simple-brand-kit-dashboard')).toBeDefined();
  });
});
