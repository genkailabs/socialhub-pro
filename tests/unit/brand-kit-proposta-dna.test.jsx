import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  approveDnaVersion: vi.fn(async () => ({ ok: true })),
  analyzeBrandDNA: vi.fn(),
  refresh: vi.fn()
}));

vi.mock('@/lib/dna-actions', () => ({
  approveDnaVersion: mocks.approveDnaVersion,
  analyzeBrandDNA: mocks.analyzeBrandDNA
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import { BrandKitTabs } from '@/components/brand-kit/BrandKitTabs';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const versoes = [
  { id: 'v2', version: 2, status: 'proposed', created_at: '2026-08-03T20:15:00Z' },
  { id: 'v1', version: 1, status: 'active', created_at: '2026-08-03T11:17:00Z', approved_at: '2026-08-03T11:17:00Z' }
];

// "Refazer diagnóstico" gera uma proposta. Se a pessoa sair da página antes de
// aprovar, a versão fica no histórico marcada como aguardando — e a tela
// precisa oferecer como aprovar, senão o Brand DNA novo nunca entra em uso.
describe('proposta de Brand DNA pendente no Brand Kit', () => {
  it('oferece aprovar a versão que está aguardando', () => {
    render(<BrandKitTabs brandId="b1" brandName="GenkaiLabs" kit={{}} versions={versoes} />);

    expect(screen.getByRole('button', { name: /Aprovar e usar esta versao/ })).toBeTruthy();
  });

  it('aprova a proposta e recarrega a tela', async () => {
    render(<BrandKitTabs brandId="b1" brandName="GenkaiLabs" kit={{}} versions={versoes} />);

    fireEvent.click(screen.getByRole('button', { name: /Aprovar e usar esta versao/ }));

    await waitFor(() => expect(mocks.approveDnaVersion).toHaveBeenCalledWith({ brandId: 'b1', versionId: 'v2' }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it('sem proposta pendente, nenhum botão de aprovar aparece', () => {
    render(<BrandKitTabs brandId="b1" brandName="GenkaiLabs" kit={{}} versions={[versoes[1]]} />);

    expect(screen.queryByRole('button', { name: /Aprovar e usar esta versao/ })).toBeNull();
  });
});
