import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  analyzeBrandDNA: vi.fn(async () => ({
    ok: true,
    version: { id: 'v2' },
    dna: { niche: 'Óticas no DF', territory: 'Atendimento que vende', bigIdea: 'Ótica perde venda por demora, não por preço' }
  })),
  approveDnaVersion: vi.fn(async () => ({ ok: true }))
}));

vi.mock('@/lib/dna-actions', () => ({
  analyzeBrandDNA: mocks.analyzeBrandDNA,
  approveDnaVersion: mocks.approveDnaVersion
}));

import { RefazerDiagnostico } from '@/components/brand-kit/RefazerDiagnostico';
import { PERGUNTAS_POSICIONAMENTO } from '@/lib/diagnostico-perguntas';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function responder(texto) {
  const campo = screen.getByRole('textbox');
  fireEvent.change(campo, { target: { value: texto } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

describe('refazer o diagnóstico com a marca já criada', () => {
  it('oferece o botão sem abrir o questionário de cara', () => {
    render(<RefazerDiagnostico brandId="b1" brandName="Ótica Vejo" />);

    expect(screen.getByRole('button', { name: /Refazer diagnóstico/ })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('faz uma pergunta por vez, na ordem do método', () => {
    render(<RefazerDiagnostico brandId="b1" brandName="Ótica Vejo" />);
    fireEvent.click(screen.getByRole('button', { name: /Refazer diagnóstico/ }));

    expect(screen.getByText(`Pergunta 1 de ${PERGUNTAS_POSICIONAMENTO.length}`)).toBeTruthy();
    expect(screen.getByText(PERGUNTAS_POSICIONAMENTO[0].pergunta)).toBeTruthy();

    responder('Montar atendimento por WhatsApp que não perde cliente');

    expect(screen.getByText(`Pergunta 2 de ${PERGUNTAS_POSICIONAMENTO.length}`)).toBeTruthy();
  });

  // O afunilamento é o método: resposta genérica volta, não vira posicionamento.
  it('devolve a pergunta quando a resposta é genérica', () => {
    render(<RefazerDiagnostico brandId="b1" brandName="Ótica Vejo" />);
    fireEvent.click(screen.getByRole('button', { name: /Refazer diagnóstico/ }));
    responder('Montar atendimento por WhatsApp que não perde cliente');

    responder('Todo mundo que quer vender mais pela internet');

    expect(screen.getByText(/não é um grupo/)).toBeTruthy();
    expect(screen.getByText(`Pergunta 2 de ${PERGUNTAS_POSICIONAMENTO.length}`)).toBeTruthy();
  });

  it('gera a proposta com as respostas e só troca depois de aprovar', async () => {
    render(<RefazerDiagnostico brandId="b1" brandName="Ótica Vejo" />);
    fireEvent.click(screen.getByRole('button', { name: /Refazer diagnóstico/ }));
    for (const pergunta of PERGUNTAS_POSICIONAMENTO) {
      responder(`Resposta específica para ${pergunta.id}, com detalhe concreto`);
    }

    fireEvent.click(screen.getByRole('button', { name: /Gerar diagnóstico novo/ }));

    await waitFor(() => expect(mocks.analyzeBrandDNA).toHaveBeenCalledTimes(1));
    const enviado = mocks.analyzeBrandDNA.mock.calls[0][0];
    expect(enviado.brandId).toBe('b1');
    expect(enviado.manual.tese).toContain('tese');
    expect(Object.keys(enviado.manual)).toHaveLength(PERGUNTAS_POSICIONAMENTO.length);

    await waitFor(() => expect(screen.getByText(/Tese: Ótica perde venda/)).toBeTruthy());
    expect(mocks.approveDnaVersion).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar e substituir' }));
    await waitFor(() => expect(mocks.approveDnaVersion).toHaveBeenCalledWith({ brandId: 'b1', versionId: 'v2' }));
    await waitFor(() => expect(screen.getByText(/continua no histórico/)).toBeTruthy());
  });

  it('mostra o erro quando a análise falha, em vez de fingir que deu certo', async () => {
    mocks.analyzeBrandDNA.mockResolvedValueOnce({ error: 'Sessão expirada.' });
    render(<RefazerDiagnostico brandId="b1" brandName="Ótica Vejo" />);
    fireEvent.click(screen.getByRole('button', { name: /Refazer diagnóstico/ }));
    for (const pergunta of PERGUNTAS_POSICIONAMENTO) {
      responder(`Resposta específica para ${pergunta.id}, com detalhe concreto`);
    }
    fireEvent.click(screen.getByRole('button', { name: /Gerar diagnóstico novo/ }));

    await waitFor(() => expect(screen.getByText('Sessão expirada.')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Aprovar e substituir' })).toBeNull();
  });
});
