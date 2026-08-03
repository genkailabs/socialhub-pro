import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkillsAgencia } from '@/components/avancado/SkillsAgencia';
import { NAV_GROUPS } from '@/data/nav';

const marca = {
  id: 'brand-1',
  name: 'GenkaiLabs',
  kit: { niche: 'IA para pequenos negócios', audience: 'Donos de ótica no DF', tone: 'Direto' }
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('modo avançado com as skills de agência', () => {
  it('separa o que alimenta o Hub do que é trabalho de agência', () => {
    render(<SkillsAgencia marca={marca} />);

    expect(screen.getByText('Alimenta o Hub')).toBeTruthy();
    expect(screen.getByText('Modo avançado')).toBeTruthy();
    expect(screen.getByText('Diagnóstico de Marca')).toBeTruthy();
    expect(screen.getByText('Landing Page Machine')).toBeTruthy();
    expect(screen.getByText('Lead Copy')).toBeTruthy();
    expect(screen.getByText('Apresentações e Propostas')).toBeTruthy();
  });

  // O ganho de estar dentro do Hub é este: o briefing já sai com a marca ativa.
  it('leva a marca ativa no link do Claude', () => {
    render(<SkillsAgencia marca={marca} />);

    const card = screen.getByText('Diagnóstico de Marca').closest('article');
    const link = within(card).getByRole('link', { name: /Abrir no Claude/ });
    const enviado = decodeURIComponent(link.getAttribute('href'));

    expect(link.getAttribute('href').startsWith('https://claude.ai/new?q=')).toBe(true);
    expect(enviado).toContain('BlueprintPRO');
    expect(enviado).toContain('GenkaiLabs');
    expect(enviado).toContain('Donos de ótica no DF');
  });

  it('a observação desta rodada entra no briefing', () => {
    render(<SkillsAgencia marca={marca} />);

    fireEvent.change(screen.getByLabelText(/O que você quer nesta rodada/), {
      target: { value: 'turma de setembro, R$ 497' }
    });

    const card = screen.getByText('Landing Page Machine').closest('article');
    const href = decodeURIComponent(within(card).getByRole('link', { name: /Abrir no Claude/ }).getAttribute('href'));

    expect(href).toContain('turma de setembro, R$ 497');
  });

  it('copia o briefing quando o navegador permite', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<SkillsAgencia marca={marca} />);

    const card = screen.getByText('Lead Copy').closest('article');
    fireEvent.click(within(card).getByRole('button', { name: /Copiar briefing/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('GenkaiLabs');
    await waitFor(() => expect(within(card).getByText('Copiado')).toBeTruthy());
  });

  it('marca sem Brand Kit não inventa contexto no briefing', () => {
    render(<SkillsAgencia marca={{ id: 'b2', name: 'Marca Nova' }} />);

    const card = screen.getByText('Diagnóstico de Marca').closest('article');
    const href = decodeURIComponent(within(card).getByRole('link', { name: /Abrir no Claude/ }).getAttribute('href'));

    expect(href).toContain('Marca: Marca Nova');
    expect(href).not.toContain('Público:');
  });

  it('a rota fica no rodapé da navegação, fora do fluxo diário', () => {
    const isolado = NAV_GROUPS.find((grupo) => grupo.isolated);

    expect(isolado.items.map((item) => item.href)).toContain('/avancado');
    expect(NAV_GROUPS.filter((g) => !g.isolated).flatMap((g) => g.items).map((i) => i.href))
      .not.toContain('/avancado');
  });
});
