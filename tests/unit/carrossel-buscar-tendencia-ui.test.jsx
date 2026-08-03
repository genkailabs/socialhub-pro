import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CarouselStudioClient } from '@/components/carrossel/CarouselStudioClient';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/posts-actions', () => ({
  saveDraft: vi.fn(async () => ({ id: 'draft-1' })),
  deleteComposerDraft: vi.fn()
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/components/onboarding/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));
vi.mock('@/components/carrossel/CarouselStudioFrame', () => ({
  CarouselStudioFrame: () => <div data-testid="studio-frame" />
}));

const marca = { id: 'brand-1', name: 'GenkaiLabs' };

const RESPOSTA_TENDENCIAS = {
  state: 'ready',
  trends: [{
    id: 'whatsapp-desktop',
    title: 'WhatsApp no computador vira ferramenta de trabalho',
    summary: 'Pequenos comércios passam a atender pela tela do caixa.',
    mechanic: 'A conversa sai do bolso e entra na mesa.',
    howTo: 'Mostre a rotina antes e depois.',
    carouselTheme: 'O atendimento saiu do bolso',
    sourceIds: ['source-1']
  }],
  sources: [{ id: 'source-1', title: 'Meta anuncia recursos de desktop', url: 'https://exemplo.com/meta', publisher: 'Exemplo', publishedAt: '2026-07-30' }]
};

function responderCom(payload, { ok = true } = {}) {
  global.fetch = vi.fn(async (url) => {
    if (String(url).includes('/api/trends')) return { ok, json: async () => payload };
    return { ok: true, json: async () => ({}) };
  });
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => responderCom(RESPOSTA_TENDENCIAS));

// O carro-chefe do produto é a análise de tendência. Sem esta ponte, ele só
// funcionava para quem já chegava sabendo sobre o que falar.
describe('buscar tendência sem sair do Studio', () => {
  it('oferece a busca no tipo que exige fonte', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    expect(screen.getByRole('button', { name: /Buscar tendência agora/ })).toBeTruthy();
  });

  it('some quando o tipo escolhido não exige fonte', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    fireEvent.click(screen.getByRole('button', { name: /Lista/ }));

    expect(screen.queryByRole('button', { name: /Buscar tendência agora/ })).toBeNull();
  });

  it('lista as tendências pesquisadas com a contagem de fontes', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    fireEvent.click(screen.getByRole('button', { name: /Buscar tendência agora/ }));

    await waitFor(() => expect(screen.getByText('WhatsApp no computador vira ferramenta de trabalho')).toBeTruthy());
    expect(screen.getByText('1 fonte')).toBeTruthy();
    const [url, init] = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/trends'));
    expect(url).toBe('/api/trends');
    expect(JSON.parse(init.body)).toEqual({ brandId: 'brand-1' });
  });

  // A evidência precisa viajar junto: o gerador exige fonte logo adiante.
  it('escolher a tendência preenche o assunto e leva as fontes no material', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    fireEvent.click(screen.getByRole('button', { name: /Buscar tendência agora/ }));
    await waitFor(() => expect(screen.getByText('WhatsApp no computador vira ferramenta de trabalho')).toBeTruthy());

    fireEvent.click(screen.getByText('WhatsApp no computador vira ferramenta de trabalho'));

    await waitFor(() => expect(screen.getByLabelText('Assunto do carrossel').value).toBe('O atendimento saiu do bolso'));
    expect(screen.getByText(/Tendência escolhida, com 1 fonte/)).toBeTruthy();
    expect(screen.queryByText('Pequenos comércios passam a atender pela tela do caixa.')).toBeNull();
  });

  it('pesquisa sem fonte avisa em vez de fingir que achou', async () => {
    responderCom({ state: 'unavailable', error: 'A pesquisa não encontrou fontes verificáveis suficientes.' }, { ok: false });
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    fireEvent.click(screen.getByRole('button', { name: /Buscar tendência agora/ }));

    await waitFor(() => expect(screen.getByText(/não encontrou fontes verificáveis/)).toBeTruthy());
    expect(screen.getByLabelText('Assunto do carrossel').value).toBe('');
  });
});
