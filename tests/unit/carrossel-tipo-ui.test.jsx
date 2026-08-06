import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CarouselStudioClient } from '@/components/carrossel/CarouselStudioClient';
import { templateDoTipo } from '@/lib/carrossel-tipos';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/posts-actions', () => ({
  saveDraft: vi.fn(async () => ({ id: 'draft-1' })),
  deleteComposerDraft: vi.fn()
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@/lib/posts-media', () => ({ uploadTempMedia: vi.fn(), removeTempMedia: vi.fn() }));
vi.mock('@/components/onboarding/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));

// O Studio roda em outra aplicação; aqui só interessa o que o Hub manda para
// ele — em especial o template de partida escolhido pelo tipo.
const framePropsRecebidas = { atual: null };
vi.mock('@/components/carrossel/CarouselStudioFrame', () => ({
  CarouselStudioFrame: (props) => {
    framePropsRecebidas.atual = props;
    return <div data-testid="studio-frame" />;
  }
}));

const marca = { id: 'brand-1', name: 'GenkaiLabs' };

function pedidosDeBrief() {
  return global.fetch.mock.calls
    .filter(([url]) => String(url).includes('/api/carrossel/brief'))
    .map(([, init]) => JSON.parse(init.body));
}

// Passo 1 → passo 2. A tela mostra uma pergunta por vez; o assunto só existe
// depois de o tipo estar escolhido.
function irParaOAssunto() {
  fireEvent.click(screen.getByRole('button', { name: /Escolher o assunto/ }));
}

describe('escolha do tipo de carrossel antes de gerar', () => {
  beforeEach(() => {
    framePropsRecebidas.atual = null;
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        stage: 'directions',
        contentType: 'analise-tendencia',
        directions: {
          flow: 'analise-tendencia',
          thesis: 'Tese editorial',
          headlineOptions: [{ id: 'headline-1', headline: 'Capa', subheadline: 'Apoio', angle: 'erro', rationale: 'Motivo', specificityAnchor: 'Âncora', sourceIds: [] }],
          narrative: [{ order: 1, role: 'cover', readerQuestion: 'O quê', purpose: 'Abrir', keyPoint: 'Ponto', sourceIds: [] }]
        },
        sources: []
      })
    }));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('abre no passo do tipo, com os dois carros-chefe no palco', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    expect(screen.getByText('Qual tipo de carrossel você quer criar?')).toBeTruthy();
    expect(screen.getByText('Passo 1 de 4')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Análise de tendência/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Case de sucesso/ })).toBeTruthy();
    expect(screen.getAllByText('Carro-chefe')).toHaveLength(2);
  });

  it('os outros tipos continuam disponíveis, com menos destaque', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    expect(screen.getByText('Outros tipos')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bastidor/ })).toBeTruthy();
    expect(screen.getByText(/Descoberta/)).toBeTruthy();
  });

  // A aula é explícita: os tipos fora dos carros-chefe têm limitação real de
  // alcance. Esconder isso venderia todos como iguais.
  it('escreve o limite honesto dos tipos que não são carro-chefe', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    expect(screen.getByText(/Não viraliza/)).toBeTruthy();
    expect(screen.getByText(/Raramente sai da bolha/)).toBeTruthy();
  });

  // Uma pergunta por vez: o campo de assunto não pode competir com a escolha
  // do tipo, que é o que decide a receita inteira do carrossel.
  it('o assunto só aparece depois do tipo escolhido', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    expect(screen.queryByLabelText('Assunto do carrossel')).toBeNull();

    irParaOAssunto();

    expect(screen.getByText('Sobre qual assunto?')).toBeTruthy();
    expect(screen.getByLabelText('Assunto do carrossel')).toBeTruthy();
    expect(screen.queryByText('Qual tipo de carrossel você quer criar?')).toBeNull();
  });

  it('já começa no carro-chefe de tendência, sem ninguém escolher', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    irParaOAssunto();
    fireEvent.change(screen.getByLabelText('Assunto do carrossel'), { target: { value: 'WhatsApp no computador' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar 5 promessas de capa/ }));

    await waitFor(() => expect(pedidosDeBrief()).toHaveLength(1));
    expect(pedidosDeBrief()[0].contentType).toBe('analise-tendencia');
  });

  it('manda o tipo escolhido para o gerador', async () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    fireEvent.click(screen.getByRole('button', { name: /Case de sucesso/ }));
    irParaOAssunto();
    fireEvent.change(screen.getByLabelText('Assunto do carrossel'), { target: { value: 'A virada da Havaianas' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar 5 promessas de capa/ }));

    await waitFor(() => expect(pedidosDeBrief()).toHaveLength(1));
    expect(pedidosDeBrief()[0].contentType).toBe('case-sucesso');
  });

  // Botão que aceita clique sem a etapa cumprida ensina a desconfiar da tela.
  it('sem assunto, avançar fica bloqueado', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();

    expect(screen.getByRole('button', { name: /Gerar 5 promessas de capa/ }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Assunto do carrossel'), { target: { value: 'Assunto qualquer' } });

    expect(screen.getByRole('button', { name: /Gerar 5 promessas de capa/ }).disabled).toBe(false);
  });

  // Tipo que exige fonte precisa avisar antes, senão o erro só aparece depois
  // de o usuário esperar a pesquisa inteira.
  it('avisa que o tipo só sai com fonte, e some quando o tipo não exige', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);
    irParaOAssunto();

    expect(screen.getByText(/só sai com fonte/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Bastidor/ }));
    irParaOAssunto();

    expect(screen.queryByText(/só sai com fonte/)).toBeNull();
    expect(screen.getByText(/não depende de notícia/)).toBeTruthy();
  });

  it('abre o Studio no template que combina com o tipo', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} />);

    expect(framePropsRecebidas.atual.templateId).toBe(templateDoTipo('analise-tendencia'));

    fireEvent.click(screen.getByRole('button', { name: /Lista/ }));

    expect(framePropsRecebidas.atual.templateId).toBe(templateDoTipo('lista'));
  });

  it('rascunho salvo reabre no tipo em que foi criado', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={marca} draft={{ id: 'p1', editorial: { version: 2, contentType: 'oferta', approvedAt: '2026-08-03T10:00:00Z' } }} />);

    expect(framePropsRecebidas.atual.templateId).toBe(templateDoTipo('oferta'));
  });
});
