import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { BrandKitShell } from '@/components/brand-kit/BrandKitShell';
import { resetOnboarding } from '@/lib/onboarding-actions';

const pushMock = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/brand-kit/BrandKitTabs', () => ({
  BrandKitTabs: () => <div data-testid="kit-tabs">KitTabs</div>
}));

vi.mock('@/components/brand-kit/DnaVersions', () => ({
  DnaVersions: () => <div data-testid="dna-versions">DnaVersions</div>
}));

vi.mock('@/lib/onboarding-actions', () => ({
  resetOnboarding: vi.fn(async () => ({ ok: true }))
}));

describe('BrandKitShell advanced config', () => {
  it('renderiza o botão Refazer onboarding guiado e as abas avançadas', () => {
    render(
      <BrandKitShell
        brandId="brd-1"
        brandName="Acme"
        brandColor="#007AFF"
        kit={{ onboarding_status: 'completed' }}
        versions={[]}
      />
    );
    expect(screen.getByText(/Refazer onboarding guiado/i)).toBeDefined();
    expect(screen.getByTestId('kit-tabs')).toBeDefined();
    expect(screen.getByTestId('dna-versions')).toBeDefined();
  });

  it('chama resetOnboarding e redireciona ao clicar no botão Refazer onboarding guiado', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(
      <BrandKitShell
        brandId="brd-1"
        brandName="Acme"
        brandColor="#007AFF"
        kit={{ onboarding_status: 'completed' }}
        versions={[]}
      />
    );

    const button = screen.getByText(/Refazer onboarding guiado/i);
    fireEvent.click(button);

    expect(window.confirm).toHaveBeenCalled();
    expect(resetOnboarding).toHaveBeenCalledWith({ brandId: 'brd-1' });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('restaura estado resetting mesmo se resetOnboarding lançar um erro', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    resetOnboarding.mockRejectedValueOnce(new Error('Falha ao resetar'));

    render(
      <BrandKitShell
        brandId="brd-1"
        brandName="Acme"
        brandColor="#007AFF"
        kit={{ onboarding_status: 'completed' }}
        versions={[]}
      />
    );

    const button = screen.getByText(/Refazer onboarding guiado/i);
    fireEvent.click(button);

    await waitFor(() => {
      expect(button.getAttribute('disabled')).toBeNull();
      expect(screen.getByText(/Refazer onboarding guiado/i)).toBeDefined();
    });
  });
});
