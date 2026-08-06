import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TrendsExplorer } from '@/components/trends/TrendsExplorer';

vi.mock('@/lib/carrossel-gpts', () => ({ gptUrl: () => null }));

const source = {
  id: 'source-1',
  title: 'Relatório original',
  publisher: 'Instituto Exemplo',
  publishedAt: '2026-08-01T12:00:00.000Z',
  url: 'https://example.com/report'
};

function trend(index) {
  return {
    id: `trend-${index}`,
    title: `Tendência ${index}`,
    summary: 'Resumo qualitativo.',
    category: 'educacao',
    profession: 'geral',
    format: 'carrossel',
    status: 'acompanhar',
    priority: 'adaptar',
    mechanic: 'Mecânica editorial.',
    howTo: 'Como executar.',
    carouselTheme: 'Tema',
    carouselPrompt: 'Crie uma sequência original.',
    sourceIds: ['source-1']
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('explorador de tendências', () => {
  it('mostra a data publicada junto da origem no detalhe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: 'ready',
        researchedAt: '2026-08-01T13:00:00.000Z',
        trends: [trend(1), trend(2), trend(3)],
        sources: [source]
      })
    }));

    render(<TrendsExplorer brandId="123e4567-e89b-42d3-a456-426614174000" brandName="Acme" />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Detalhes' })).toHaveLength(3));
    fireEvent.click(screen.getAllByRole('button', { name: 'Detalhes' })[0]);

    expect(screen.getByText('Instituto Exemplo')).toBeDefined();
    expect(screen.getByText('1 de ago. de 2026')).toBeDefined();
  });

  it('alterna grade/lista e permite mostrar somente os curtidos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: 'ready',
        researchedAt: '2026-08-01T13:00:00.000Z',
        trends: [trend(1), trend(2), trend(3)],
        sources: [source]
      })
    }));

    render(<TrendsExplorer brandId="123e4567-e89b-42d3-a456-426614174000" brandName="Acme" />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Detalhes' })).toHaveLength(3));

    fireEvent.click(screen.getAllByRole('button', { name: 'Curtir localmente' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Curtidos' }));
    expect(screen.getAllByRole('button', { name: 'Detalhes' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByRole('list', { name: 'Padrões em lista' })).toBeDefined();
  });
});
