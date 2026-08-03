import { describe, expect, it } from 'vitest';
import { legendaDoRoteiro } from '@/lib/carrossel-legenda';

const briefCompleto = {
  caption: {
    hook: 'Sua equipe refaz o mesmo relatório toda semana.',
    takeaway: 'O gargalo é o processo, não a ferramenta.',
    cta: 'Salve para revisar antes da próxima sprint.',
    hashtags: ['#processos', '#gestao']
  }
};

describe('legenda do carrossel', () => {
  it('monta a legenda com gancho, aprendizado e CTA do roteiro aprovado', () => {
    expect(legendaDoRoteiro({ brief: briefCompleto })).toEqual({
      caption: 'Sua equipe refaz o mesmo relatório toda semana.\n\n'
        + 'O gargalo é o processo, não a ferramenta.\n\n'
        + 'Salve para revisar antes da próxima sprint.',
      hashtags: ['#processos', '#gestao']
    });
  });

  // O roteiro é a única fonte de hashtag do carrossel. Sem ele, publicar sem
  // hashtag é honesto; inventar tag na hora não é.
  it('devolve a legenda de reserva sem hashtag quando não há roteiro', () => {
    expect(legendaDoRoteiro(null, 'Rascunho de carrossel')).toEqual({
      caption: 'Rascunho de carrossel',
      hashtags: []
    });
  });

  it('aceita roteiro antigo, salvo antes de existir hashtag', () => {
    const antigo = { brief: { caption: { hook: 'Gancho.', takeaway: 'Aprendizado.', cta: 'Salve.' } } };

    expect(legendaDoRoteiro(antigo)).toEqual({
      caption: 'Gancho.\n\nAprendizado.\n\nSalve.',
      hashtags: []
    });
  });

  // Roteiro colado à mão não passa pelo schema: tem editorial, não tem brief.
  it('usa a reserva quando o editorial não veio do gerador', () => {
    expect(legendaDoRoteiro({ headline: 'Capa colada', approvedAt: '2026-08-03T00:00:00.000Z' }, 'Capa colada'))
      .toEqual({ caption: 'Capa colada', hashtags: [] });
  });
});
