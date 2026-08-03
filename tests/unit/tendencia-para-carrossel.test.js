import { describe, expect, it } from 'vitest';
import { tendenciaParaEntrada } from '@/lib/instagram-trends';

const tendencia = {
  id: 'whatsapp-no-desktop',
  title: 'WhatsApp no computador vira ferramenta de trabalho',
  summary: 'Uso do app em desktop cresce entre pequenos comércios que atendem no balcão.',
  mechanic: 'A conversa sai do celular e entra na mesa de trabalho, junto do estoque e do caixa.',
  howTo: 'Mostre a rotina antes e depois da mudança, com o print da tela dividida.',
  carouselTheme: 'O atendimento saiu do bolso e foi para a mesa',
  carouselPrompt: 'Explique o que muda na rotina de quem atende no balcão.',
  sourceIds: ['source-1', 'source-3']
};

const fontes = [
  { id: 'source-1', title: 'Meta anuncia recursos de desktop', url: 'https://exemplo.com/meta', publisher: 'Exemplo', publishedAt: '2026-07-30' },
  { id: 'source-2', title: 'Nada a ver', url: 'https://exemplo.com/outro', publisher: 'Outro', publishedAt: '' },
  { id: 'source-3', title: 'Pequeno varejo adota atendimento na mesa', url: 'https://exemplo.com/varejo', publisher: 'Varejo Hoje', publishedAt: '2026-07-28' }
];

// A análise de tendência exige fonte. Escolher uma tendência pesquisada tem de
// levar a evidência junto, senão o gerador recusa o roteiro logo depois — e a
// pessoa não entende por quê.
describe('tendência escolhida virando entrada do carrossel', () => {
  it('usa o tema do carrossel como assunto, com o título como reserva', () => {
    expect(tendenciaParaEntrada(tendencia, fontes).topic)
      .toBe('O atendimento saiu do bolso e foi para a mesa');

    const semTema = { ...tendencia, carouselTheme: '' };
    expect(tendenciaParaEntrada(semTema, fontes).topic)
      .toBe('WhatsApp no computador vira ferramenta de trabalho');
  });

  it('leva mecânica, execução e o resumo no material de origem', () => {
    const { sourceMaterial } = tendenciaParaEntrada(tendencia, fontes);

    expect(sourceMaterial).toContain('Uso do app em desktop cresce');
    expect(sourceMaterial).toContain('A conversa sai do celular');
    expect(sourceMaterial).toContain('Mostre a rotina antes e depois');
  });

  it('anexa só as fontes citadas pela tendência, com link', () => {
    const { sourceMaterial } = tendenciaParaEntrada(tendencia, fontes);

    expect(sourceMaterial).toContain('https://exemplo.com/meta');
    expect(sourceMaterial).toContain('https://exemplo.com/varejo');
    expect(sourceMaterial).not.toContain('https://exemplo.com/outro');
  });

  it('devolve as fontes usadas, para quem chamou saber que há evidência', () => {
    expect(tendenciaParaEntrada(tendencia, fontes).sources.map((s) => s.id))
      .toEqual(['source-1', 'source-3']);
  });

  it('tendência sem fonte não vira entrada silenciosamente', () => {
    const semFonte = tendenciaParaEntrada({ ...tendencia, sourceIds: [] }, fontes);

    expect(semFonte.sources).toEqual([]);
    expect(semFonte.topic).toBeTruthy();
  });

  it('entrada inválida devolve vazio em vez de quebrar a tela', () => {
    expect(tendenciaParaEntrada(null, fontes)).toEqual({ topic: '', sourceMaterial: '', sources: [] });
    expect(tendenciaParaEntrada(tendencia, null).sources).toEqual([]);
  });

  it('respeita o teto de material aceito pela rota do briefing', () => {
    const gigante = {
      ...tendencia,
      summary: 'a'.repeat(4000),
      mechanic: 'b'.repeat(4000),
      howTo: 'c'.repeat(4000)
    };

    expect(tendenciaParaEntrada(gigante, fontes).sourceMaterial.length).toBeLessThanOrEqual(6000);
  });
});
