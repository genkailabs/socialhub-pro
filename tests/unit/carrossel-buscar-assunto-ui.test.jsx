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

const RESPOSTA_ASSUNTOS = {
  state: 'ready',
  origem: 'busca',
  assuntos: [{
    id: 'casamento-de-jogador',
    titulo: 'Casamento de jogador domina as redes',
    resumo: 'A cerimônia virou assunto pela transmissão feita pelos convidados.',
    angulo: 'Por que acontecimento pessoal gera mais atenção que anúncio pago.',
    relacaoComNicho: 'O público da marca acompanhou a transmissão.',
    confirmado: true,
    fontes: [{ id: 'source-1', title: 'A notícia', url: 'https://exemplo.com/n', publisher: 'Portal Exemplo', publishedAt: '2026-07-30', data: '30/07/2026' }]
  }],
  sources: []
};

function responderCom(payload, { ok = true } = {}) {
  global.fetch = vi.fn(async (url) => {
    if (String(url).includes('/api/carrossel/assuntos')) return { ok, json: async () => payload };
    return { ok: true, json: async () => ({}) };
  });
}

function irParaOAssunto() {
  fireEvent.click(screen.getByRole('button', { name: /Escolher o assunto/ }));
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => responderCom(RESPOSTA_ASSUNTOS));

// O carro-chefe do produto é a análise de tendência. Sem esta ponte, ele só
// funcionava para quem já chegava sabendo sobre o que falar — e o que a tela
// chamava de "tendência" antes era estratégia de conteúdo, não acontecimento.
describe('buscar o assunto sem sair do Studio', () => {
  it('oferece os três caminhos do assunto no tipo que pesquisa', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();

    expect(screen.getByRole('button', { name: /Buscar tendências atuais/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Usar uma fonte minha/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Escrever o assunto/ })).toBeTruthy();
  });

  it('em case de sucesso a busca procura case, não tendência', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    fireEvent.click(screen.getByRole('button', { name: /Case de sucesso/ }));
    irParaOAssunto();

    expect(screen.getByRole('button', { name: /Buscar cases reais/ })).toBeTruthy();
  });

  it('tipo que não pesquisa não oferece busca — só fonte própria e escrever', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    fireEvent.click(screen.getByRole('button', { name: /Lista/ }));
    irParaOAssunto();

    expect(screen.queryByRole('button', { name: /Buscar tendências atuais/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Usar uma fonte minha/ })).toBeTruthy();
  });

  // Toda notícia mostra fonte e data: é a diferença entre pauta e boato.
  it('lista os assuntos com ângulo, veículo e data', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();

    fireEvent.click(screen.getByRole('button', { name: /Buscar tendências agora/ }));

    await waitFor(() => expect(screen.getByText('Casamento de jogador domina as redes')).toBeTruthy());
    expect(screen.getByText(/Por que acontecimento pessoal gera mais atenção/)).toBeTruthy();
    expect(screen.getByText('Portal Exemplo · 30/07/2026')).toBeTruthy();
    const [url, init] = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/carrossel/assuntos'));
    expect(url).toBe('/api/carrossel/assuntos');
    expect(JSON.parse(init.body)).toEqual({ brandId: 'brand-1', contentType: 'analise-tendencia' });
  });

  // A evidência precisa viajar junto: o gerador exige fonte logo adiante.
  it('escolher o assunto preenche o campo e leva as fontes no material', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();
    fireEvent.click(screen.getByRole('button', { name: /Buscar tendências agora/ }));
    await waitFor(() => expect(screen.getByText('Casamento de jogador domina as redes')).toBeTruthy());

    fireEvent.click(screen.getByText('Casamento de jogador domina as redes'));

    await waitFor(() => expect(screen.getByLabelText('Assunto do carrossel').value).toBe('Casamento de jogador domina as redes'));
    expect(screen.getByText(/Assunto escolhido, com 1 fonte/)).toBeTruthy();
  });

  it('material colado vira assunto pela mesma rota, sem pesquisa web', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();
    fireEvent.click(screen.getByRole('button', { name: /Usar uma fonte minha/ }));

    const material = 'Transcrição: a marca trocou anúncios por vídeos gravados pelos próprios funcionários.';
    fireEvent.change(screen.getByLabelText('Sua fonte'), { target: { value: material } });
    fireEvent.click(screen.getByRole('button', { name: /Tirar assuntos daqui/ }));

    await waitFor(() => expect(screen.getByText('Casamento de jogador domina as redes')).toBeTruthy());
    const [, init] = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/carrossel/assuntos'));
    expect(JSON.parse(init.body).material).toBe(material);
  });

  it('material curto demais não gasta pesquisa', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();
    fireEvent.click(screen.getByRole('button', { name: /Usar uma fonte minha/ }));
    fireEvent.change(screen.getByLabelText('Sua fonte'), { target: { value: 'link legal' } });

    expect(screen.getByRole('button', { name: /Tirar assuntos daqui/ }).disabled).toBe(true);
  });

  it('rumor aparece marcado como não confirmado', async () => {
    responderCom({
      ...RESPOSTA_ASSUNTOS,
      assuntos: [{ ...RESPOSTA_ASSUNTOS.assuntos[0], confirmado: false }]
    });
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();

    fireEvent.click(screen.getByRole('button', { name: /Buscar tendências agora/ }));

    await waitFor(() => expect(screen.getByText('Não confirmado')).toBeTruthy());
  });

  it('pesquisa sem fonte avisa em vez de fingir que achou', async () => {
    responderCom({ state: 'unavailable', error: 'A pesquisa não encontrou fontes verificáveis suficientes.' }, { ok: false });
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();

    fireEvent.click(screen.getByRole('button', { name: /Buscar tendências agora/ }));

    await waitFor(() => expect(screen.getByText(/não encontrou fontes verificáveis/)).toBeTruthy());
    expect(screen.getByLabelText('Assunto do carrossel').value).toBe('');
  });
});
