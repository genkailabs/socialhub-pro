import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CarouselStudioClient } from '@/components/carrossel/CarouselStudioClient';

// O componente navega para a revisão depois de exportar, então precisa de um
// roteador — em jsdom ele não vem de graça.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/posts-actions', () => ({
  saveDraft: vi.fn(async () => ({ id: 'draft-1' })),
  deleteComposerDraft: vi.fn()
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@/lib/posts-media', () => ({
  uploadTempMedia: vi.fn(),
  removeTempMedia: vi.fn(async () => ({ ok: true }))
}));
vi.mock('@/components/onboarding/Mascot', () => ({ Mascot: () => <div data-testid="mascot" /> }));

// O Studio é outra aplicação, dentro de um iframe: aqui ele é substituído por
// botões que disparam a mesma mensagem de seleção que a ponte entrega.
vi.mock('@/components/carrossel/CarouselStudioFrame', () => ({
  CarouselStudioFrame: ({ onSelection }) => (
    <div data-testid="studio-frame">
      <button type="button" onClick={() => onSelection?.({ slideIndex: 1, elementType: 'image', slot: 2 })}>
        Selecionar imagem do slide 2
      </button>
      <button type="button" onClick={() => onSelection?.({ slideIndex: 0, elementType: 'text', slot: null })}>
        Selecionar um texto
      </button>
      <button type="button" onClick={() => onSelection?.({ slideIndex: 1, elementType: null, slot: null })}>
        Clicar no fundo
      </button>
    </div>
  )
}));

const script = [
  'CINCO ERROS AO USAR IA NO ESCRITÓRIO', 'A ferramenta nunca foi o problema.',
  'O time adota a ferramenta sem combinar quem revisa', 'Sem revisor, o erro chega ao cliente.',
  'Comece pela tarefa repetitiva', 'Meça o tempo antes e depois.'
].map((bloco, index) => `texto ${index + 1} - ${bloco}`).join('\n\n');

const pastedDraft = {
  id: 'd1',
  editorial: { source: 'pasted-script', script, slideCount: 3, approvedAt: '2026-08-01T00:00:00.000Z' }
};

function renderStudio(draft = pastedDraft) {
  return render(<CarouselStudioClient brandId="brand-1" brand={{ name: 'GenkaiLabs' }} draft={draft} embedded />);
}

describe('dica de foto ao clicar na imagem do slide', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('só abre depois que o Studio avisa que a imagem foi selecionada', () => {
    renderStudio();

    expect(screen.queryByText('Procure uma foto de:')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    const painel = screen.getByLabelText('Foto sugerida para este slide');
    expect(within(painel).getByText('Slide 02 · imagem')).toBeTruthy();
    expect(within(painel).getByText(/escritório pequeno/)).toBeTruthy();
  });

  it('ignora seleção de texto e fecha ao clicar no fundo', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar um texto' }));
    expect(screen.queryByLabelText('Foto sugerida para este slide')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));
    expect(screen.getByLabelText('Foto sugerida para este slide')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clicar no fundo' }));
    expect(screen.queryByLabelText('Foto sugerida para este slide')).toBeNull();
  });

  it('leva os termos em inglês para a busca do Pexels', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    const link = screen.getByRole('link', { name: /Buscar no Pexels/ });
    expect(link.getAttribute('href')).toContain('pexels.com/search/');
    expect(decodeURIComponent(link.getAttribute('href'))).toContain('small office');
  });

  it('copia os termos de busca', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    fireEvent.click(screen.getByLabelText('Copiar os termos de busca'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('small office');
    vi.unstubAllGlobals();
  });

  it('flutua sobre o editor em vez de empurrar o layout', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    const painel = screen.getByLabelText('Foto sugerida para este slide');
    expect(painel.className).toContain('absolute');
    expect(painel.className).not.toContain('shrink-0');
  });

  it('tira a gaveta do roteiro da frente ao abrir a dica', () => {
    renderStudio();
    fireEvent.click(screen.getByText('Trocar roteiro'));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    expect(document.getElementById('carousel-editorial').getAttribute('aria-hidden')).toBe('true');
  });

  it('fecha no Esc', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByLabelText('Foto sugerida para este slide')).toBeNull();
  });

  it('fecha pelo botão de fechar', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    fireEvent.click(screen.getByLabelText('Fechar a dica de foto'));

    expect(screen.queryByLabelText('Foto sugerida para este slide')).toBeNull();
  });

  it('usa a dica escrita pela IA quando o roteiro veio dela', () => {
    render(<CarouselStudioClient
      brandId="brand-1"
      brand={{ name: 'GenkaiLabs' }}
      draft={{
        id: 'd2',
        editorial: {
          approvedAt: '2026-08-01T00:00:00.000Z',
          selectedHeadlineId: 'headline-1',
          brief: {
            slides: [
              { order: 1, role: 'cover', headline: 'Capa', readerTakeaway: 'Tema.' },
              {
                order: 2,
                role: 'teach',
                headline: 'Segundo slide',
                readerTakeaway: 'Passo.',
                imageIdea: { scene: 'sala de reunião vazia vista de cima', searchTerms: ['empty meeting room', 'overhead'], avoid: 'gente posando' }
              }
            ]
          }
        }
      }}
      embedded
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    const painel = screen.getByLabelText('Foto sugerida para este slide');
    expect(within(painel).getByText(/sala de reunião vazia vista de cima/)).toBeTruthy();
    expect(within(painel).getByText(/Evite gente posando/)).toBeTruthy();
  });
});

describe('a gaveta do roteiro deixou de carregar a dica', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('lista os slides e manda clicar na imagem, sem repetir a dica', () => {
    renderStudio();
    const gaveta = document.getElementById('carousel-editorial');

    expect(within(gaveta).getByText('Roteiro no Studio')).toBeTruthy();
    expect(within(gaveta).getByText(/Clique na imagem de um slide no editor/)).toBeTruthy();
    expect(within(gaveta).queryByText('Procure uma foto de:')).toBeNull();
    expect(document.querySelector('.fixed.bottom-5.right-5')).toBeNull();
  });

  it('"Trocar roteiro" devolve o formulário de entrada', () => {
    renderStudio();

    fireEvent.click(screen.getByText('Trocar roteiro'));

    // O rascunho nasceu de texto colado, então a entrada volta por onde ele
    // entrou. Quem quiser gerar com IA troca no seletor e cai no passo 1.
    expect(screen.getByText('Cole o seu roteiro')).toBeTruthy();

    fireEvent.click(screen.getByText('Gerar com IA'));

    expect(screen.getByText('Qual tipo de carrossel você quer criar?')).toBeTruthy();
    expect(screen.queryByText('Roteiro no Studio')).toBeNull();
  });

  it('não repete o mascote no passo do assunto', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={{ name: 'GenkaiLabs' }} embedded />);

    expect(screen.queryByText('Como esta tela funciona')).toBeNull();
    expect(screen.getAllByTestId('mascot')).toHaveLength(1);
  });
});
