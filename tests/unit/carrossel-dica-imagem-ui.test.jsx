import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

// A dica de foto deixou de ser um cartão flutuante deste lado: ela atravessa a
// ponte e é desenhada dentro do painel Mídia do Studio, que é outra aplicação.
// O que se pode verificar aqui é o que sai daqui — as dicas entregues ao
// iframe — e a ausência do cartão antigo.
let hintsEntregues = null;
vi.mock('@/components/carrossel/CarouselStudioFrame', () => ({
  CarouselStudioFrame: ({ onSelection, imageHints }) => {
    hintsEntregues = imageHints;
    return (
      <div data-testid="studio-frame">
        <button type="button" onClick={() => onSelection?.({ slideIndex: 1, elementType: 'image', slot: 2 })}>
          Selecionar imagem do slide 2
        </button>
      </div>
    );
  }
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

describe('dica de foto entregue ao editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hintsEntregues = null;
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('manda uma dica por slide, com cena, termos e o que evitar', () => {
    renderStudio();

    expect(Array.isArray(hintsEntregues)).toBe(true);
    expect(hintsEntregues.length).toBe(3);
    const segunda = hintsEntregues.find((hint) => hint.order === 2);
    expect(segunda.scene).toMatch(/escritório pequeno/);
    expect(segunda.query).toContain('small office');
    expect(segunda.queryPt).toBeTruthy();
    expect(segunda.avoid).toBeTruthy();
    expect(segunda.headline).toBeTruthy();
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

    const segunda = hintsEntregues.find((hint) => hint.order === 2);
    expect(segunda.scene).toBe('sala de reunião vazia vista de cima');
    expect(segunda.avoid).toBe('gente posando');
  });

  it('não desenha mais nenhum cartão de dica por cima do editor', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    expect(screen.queryByLabelText('Foto sugerida para este slide')).toBeNull();
    expect(screen.queryByText('Procure uma foto de:')).toBeNull();
    expect(screen.queryByRole('link', { name: /Buscar no Pexels/ })).toBeNull();
  });

  it('tira a gaveta do roteiro da frente quando a foto é selecionada', () => {
    renderStudio();
    fireEvent.click(screen.getByText('Trocar roteiro'));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar imagem do slide 2' }));

    expect(document.getElementById('carousel-editorial').getAttribute('aria-hidden')).toBe('true');
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
