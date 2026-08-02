import { describe, expect, it } from 'vitest';
import { carouselPrompt, gptUrl, headlinePrompt } from '@/lib/carrossel-gpts';

describe('carrossel — segunda consulta em GPT próprio', () => {
  it('monta o prompt só com o que existe', () => {
    expect(carouselPrompt({ topic: 'IA para advogados' })).toBe('Assunto: IA para advogados');
    expect(carouselPrompt({ topic: 'IA', brandName: 'GenkaiLabs', context: 'público B2B' }))
      .toBe('Assunto: IA\nMarca: GenkaiLabs\nContexto: público B2B');
  });

  it('achata quebras de linha, porque a caixa do GPT é uma linha só', () => {
    expect(carouselPrompt({ topic: 'primeira\n\nsegunda' })).toBe('Assunto: primeira segunda');
  });

  it('o diagnóstico leva a headline escolhida e o tema', () => {
    const prompt = headlinePrompt({ headline: 'O erro que custa clientes', topic: 'IA' });
    expect(prompt).toContain('Diagnostique esta capa');
    expect(prompt).toContain('O erro que custa clientes');
    expect(prompt).toContain('Tema do carrossel: IA');
  });

  it('devolve a URL do GPT com a caixa preenchida', () => {
    const url = gptUrl('carrossel', 'Assunto: IA');
    expect(url).toContain('https://chatgpt.com/g/g-6a6df245f5388191a38880b901975ddc-content-machine-carrosseis');
    expect(url).toContain(`q=${encodeURIComponent('Assunto: IA')}`);
  });

  it('usa os destinos exatos dos GPTs externos', () => {
    expect(gptUrl('carrossel', 'IA')).toContain('https://chatgpt.com/g/g-6a6df245f5388191a38880b901975ddc-content-machine-carrosseis');
    expect(gptUrl('headline', 'IA')).toContain('https://chatgpt.com/g/g-6a6df6c166bc81918316d84180574e20-headline-generator');
  });

  // Um prompt cortado no meio pelo navegador é pior do que nenhum: melhor abrir
  // o GPT limpo e deixar a pessoa colar.
  it('abre o GPT sem texto quando a URL passaria do limite', () => {
    const url = gptUrl('headline', 'x'.repeat(3000));
    expect(url).not.toContain('?q=');
    expect(url).toContain('headline-generator');
  });

  it('não devolve link sem conteúdo nem para GPT desconhecido', () => {
    expect(gptUrl('carrossel', '   ')).toBeNull();
    expect(gptUrl('inexistente', 'texto')).toBeNull();
  });
});
