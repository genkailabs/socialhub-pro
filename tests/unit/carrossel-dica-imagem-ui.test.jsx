import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CarouselStudioClient } from '@/components/carrossel/CarouselStudioClient';

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
vi.mock('@/components/carrossel/CarouselStudioFrame', () => ({
  CarouselStudioFrame: () => <div data-testid="studio-frame" />
}));

const directions = {
  problem: 'A equipe repete trabalho.',
  learningOutcome: 'Escolher a primeira tarefa a automatizar.',
  headlineOptions: [{ id: 'headline-1', headline: 'Capa escolhida', subheadline: 'Apoio', angle: 'erro', rationale: 'Funciona' }],
  narrative: [{ order: 1, role: 'cover' }]
};

const brief = {
  selectedHeadlineId: 'headline-1',
  slides: [
    {
      order: 1,
      role: 'cover',
      headline: 'Capa escolhida',
      readerTakeaway: 'O tema em uma frase.',
      imageIdea: { scene: 'sala de reunião vazia vista de cima', searchTerms: ['empty meeting room', 'overhead view'], avoid: 'gente posando para a câmera' }
    },
    {
      order: 2,
      role: 'teach',
      headline: 'Cinco erros ao usar inteligência artificial no escritório',
      body: 'A equipe adota a ferramenta sem combinar quem revisa o resultado.',
      readerTakeaway: 'Defina o revisor antes de automatizar.'
    }
  ]
};

function renderComRoteiro() {
  return render(<CarouselStudioClient
    brandId="brand-1"
    brand={{ name: 'GenkaiLabs' }}
    draft={{ id: 'draft-1', editorial: { directions, brief, selectedHeadlineId: 'headline-1', sources: [] } }}
    embedded
  />);
}

describe('dica de imagem na gaveta do roteiro', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('mostra em cada slide que foto procurar', () => {
    renderComRoteiro();

    expect(screen.getAllByText('Procure uma foto de:')).toHaveLength(2);
    expect(screen.getByText(/sala de reunião vazia vista de cima/)).toBeTruthy();
  });

  it('usa a dica da IA quando ela existe e monta a local quando falta', () => {
    renderComRoteiro();
    const termos = screen.getAllByLabelText('Copiar os termos de busca')
      .map((button) => button.parentElement.querySelector('code').textContent);

    expect(termos[0]).toContain('empty meeting room');
    expect(termos[1]).toContain('artificial intelligence');
    expect(termos.every((query) => query.includes('editorial magazine'))).toBe(true);
  });

  it('diz a regra genérica uma vez e o "evite" só quando ele é do slide', () => {
    renderComRoteiro();

    expect(screen.getAllByText(/foto com texto, logo ou gráfico/)).toHaveLength(1);
    expect(screen.getAllByText(/^Evite:/)).toHaveLength(1);
    expect(screen.getByText('Evite: gente posando para a câmera')).toBeTruthy();
  });

  it('copia os termos de busca para a área de transferência', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderComRoteiro();

    fireEvent.click(screen.getAllByLabelText('Copiar os termos de busca')[0]);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('empty meeting room');
    expect(screen.getByText('Termos de busca copiados.')).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('avisa quando o navegador não deixa copiar', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    renderComRoteiro();

    fireEvent.click(screen.getAllByLabelText('Copiar os termos de busca')[0]);

    await waitFor(() => expect(screen.getByText(/copie à mão/)).toBeTruthy());
    vi.unstubAllGlobals();
  });
});

describe('o Hub explica dentro da gaveta, não sobre o canvas', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renderiza a explicação dentro da gaveta do roteiro', () => {
    renderComRoteiro();
    const gaveta = document.getElementById('carousel-editorial');

    expect(within(gaveta).getByText('Carrossel: aqui o texto; ao lado, a arte.')).toBeTruthy();
    expect(document.querySelector('.fixed.bottom-5.right-5')).toBeNull();
  });

  it('não repete o mascote no passo do assunto', () => {
    render(<CarouselStudioClient brandId="brand-1" brand={{ name: 'GenkaiLabs' }} embedded />);

    expect(screen.queryByText('Carrossel: aqui o texto; ao lado, a arte.')).toBeNull();
    expect(screen.getAllByTestId('mascot')).toHaveLength(1);
  });
});
