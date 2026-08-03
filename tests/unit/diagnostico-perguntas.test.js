import { describe, expect, it } from 'vitest';
import {
  PERGUNTAS_POSICIONAMENTO, perguntaPorId, proximaPergunta,
  avaliarResposta, respostasParaManual, RESPOSTA_MINIMA
} from '@/lib/diagnostico-perguntas';

describe('questionário de posicionamento do mascote', () => {
  it('segue a ordem do método: competência, quem tem a dor, território, nicho, ICP, dor, tese', () => {
    expect(PERGUNTAS_POSICIONAMENTO.map((p) => p.id))
      .toEqual(['competencia', 'grupo', 'territorio', 'nicho', 'icp', 'dor', 'tese']);
  });

  it('cada pergunta fala como gente e mostra um exemplo forte', () => {
    for (const pergunta of PERGUNTAS_POSICIONAMENTO) {
      expect(pergunta.pergunta.endsWith('?')).toBe(true);
      expect(pergunta.ajuda.length).toBeGreaterThan(20);
      expect(pergunta.exemplo.length).toBeGreaterThan(15);
      expect(pergunta.campo.length).toBeGreaterThan(2);
    }
  });

  it('busca por id não devolve a primeira pergunta quando o id não existe', () => {
    expect(perguntaPorId('inventada')).toBeNull();
    expect(perguntaPorId('nicho')?.campo).toBe('nicho');
  });

  // O método afunila: resposta curta demais ou genérica volta com repergunta,
  // em vez de virar um posicionamento que serve para qualquer marca.
  it('recusa resposta curta demais', () => {
    const veredito = avaliarResposta('competencia', 'marketing');

    expect(veredito.ok).toBe(false);
    expect(veredito.motivo).toMatch(/específic/i);
  });

  it('recusa resposta genérica mesmo quando é longa', () => {
    const veredito = avaliarResposta('grupo', 'Todo mundo que quer crescer nas redes sociais e vender mais pela internet');

    expect(veredito.ok).toBe(false);
    expect(veredito.motivo).toMatch(/todo mundo|genéric/i);
  });

  it('aceita resposta concreta', () => {
    const veredito = avaliarResposta('grupo', 'Donos de ótica no Distrito Federal que atendem no balcão e perdem venda no WhatsApp');

    expect(veredito.ok).toBe(true);
    expect(veredito.motivo).toBe('');
  });

  it('trata pergunta desconhecida sem travar o fluxo', () => {
    expect(avaliarResposta('nao-existe', 'qualquer coisa').ok).toBe(true);
  });

  it('exige um mínimo de caracteres declarado, para a tela poder avisar antes', () => {
    expect(RESPOSTA_MINIMA).toBeGreaterThanOrEqual(12);
    expect(avaliarResposta('dor', 'a'.repeat(RESPOSTA_MINIMA - 1)).ok).toBe(false);
  });

  it('caminha para a próxima pergunta e termina depois da última', () => {
    expect(proximaPergunta({}).id).toBe('competencia');
    expect(proximaPergunta({ competencia: 'x' }).id).toBe('grupo');

    const tudo = Object.fromEntries(PERGUNTAS_POSICIONAMENTO.map((p) => [p.id, 'respondido']));
    expect(proximaPergunta(tudo)).toBeNull();
  });

  // O que a IA recebe precisa ser rotulado, senão vira um monte de texto solto.
  it('vira contexto rotulado para o Brand DNA, ignorando o que ficou em branco', () => {
    const manual = respostasParaManual({
      competencia: 'Configurar atendimento por WhatsApp em ótica',
      grupo: 'Donos de ótica no DF',
      nicho: '   ',
      objetivo: 'Vender mais'
    });

    expect(manual.competencia).toContain('WhatsApp');
    expect(manual.grupo).toBe('Donos de ótica no DF');
    expect(manual.nicho).toBeUndefined();
    expect(manual.objetivo).toBe('Vender mais');
  });
});
