import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { preparePastedCarouselScript, serializeCarouselBrief } from '@/lib/carrossel-script-import';

describe('importação de roteiro pronto no carrossel', () => {
  it('transforma 18 campos texto em 9 slides sem reescrever o conteúdo', () => {
    const raw = Array.from({ length: 18 }, (_, index) => (
      `texto ${index + 1} - Conteúdo original ${index + 1}`
    )).join('\n\n');

    expect(preparePastedCarouselScript(raw)).toEqual({
      ok: true,
      blocks: Array.from({ length: 18 }, (_, index) => `Conteúdo original ${index + 1}`),
      blockCount: 18,
      slideCount: 9,
      script: Array.from({ length: 18 }, (_, index) => (
        `texto ${index + 1} - Conteúdo original ${index + 1}`
      )).join('\n\n')
    });
  });

  it('aceita separadores comuns e mantém parágrafos dentro do mesmo campo', () => {
    const raw = [
      'texto 1: CAPA',
      'texto 2 – Linha um.\nLinha dois.',
      'texto 3 - CONTEXTO',
      'texto 4: Explicação.',
      'texto 5 - CTA',
      'texto 6: Salve este post.'
    ].join('\n');

    const result = preparePastedCarouselScript(raw);
    expect(result.ok).toBe(true);
    expect(result.blocks).toEqual([
      'CAPA',
      'Linha um.\nLinha dois.',
      'CONTEXTO',
      'Explicação.',
      'CTA',
      'Salve este post.'
    ]);
    expect(result.slideCount).toBe(3);
  });

  it('explica quando faltam pares ou quando o roteiro excede dez slides', () => {
    expect(preparePastedCarouselScript('texto 1 - Capa\ntexto 2 - Apoio')).toMatchObject({
      ok: false,
      error: expect.stringContaining('3 slides')
    });

    const odd = Array.from({ length: 7 }, (_, index) => `texto ${index + 1} - Bloco ${index + 1}`).join('\n');
    expect(preparePastedCarouselScript(odd)).toMatchObject({
      ok: false,
      error: expect.stringContaining('pares')
    });

    const tooLong = Array.from({ length: 22 }, (_, index) => `texto ${index + 1} - Bloco ${index + 1}`).join('\n');
    expect(preparePastedCarouselScript(tooLong)).toMatchObject({
      ok: false,
      error: expect.stringContaining('10 slides')
    });
  });

  it('expõe a entrada manual e envia a contagem calculada ao Studio', () => {
    const client = readFileSync('components/carrossel/CarouselStudioClient.jsx', 'utf8');
    // A entrada da Ideia virou assistente em etapas e mudou de arquivo; o
    // caminho do roteiro colado continua o mesmo, só que dentro dele.
    const wizard = readFileSync('components/carrossel/IdeiaWizard.jsx', 'utf8');

    expect(wizard).toContain('Colar roteiro pronto');
    expect(wizard).toContain('Aplicar texto no Studio');
    expect(client).toContain('preparePastedCarouselScript');
    expect(client).toContain('slideCount={initialSlideCount}');
  });

  it('aceita exatamente os limites de 3 e 10 slides', () => {
    for (const fieldCount of [6, 20]) {
      const raw = Array.from({ length: fieldCount }, (_, index) => `texto ${index + 1} - Bloco ${index + 1}`).join('\n');
      expect(preparePastedCarouselScript(raw)).toMatchObject({
        ok: true,
        blockCount: fieldCount,
        slideCount: fieldCount / 2
      });
    }
  });

  it('remove uma cerca Markdown que envolve o roteiro', () => {
    const raw = `\`\`\`markdown\n${Array.from({ length: 6 }, (_, index) => `texto ${index + 1} - Bloco ${index + 1}`).join('\n')}\n\`\`\``;
    const result = preparePastedCarouselScript(raw);

    expect(result).toMatchObject({ ok: true, blockCount: 6, slideCount: 3 });
    expect(result.blocks[5]).toBe('Bloco 6');
    expect(result.script).not.toContain('```');
  });

  it('não faz fallback quando existe marcador texto N inválido ou incompleto', () => {
    const invalid = [
      'texto 1 - CAPA',
      'texto 2 sem separador',
      'texto 3 - CONTEXTO',
      'texto 4 - Corpo',
      'texto 5 - CTA',
      'texto 6 - Salve'
    ].join('\n\n');

    expect(preparePastedCarouselScript(invalid)).toMatchObject({
      ok: false,
      error: expect.stringContaining('formato')
    });
  });

  it('serializa seis slides do briefing em doze campos numerados e ordenados', () => {
    const slides = Array.from({ length: 6 }, (_, index) => ({
      headline: `Título ${index + 1}`,
      body: `Corpo ${index + 1}`
    }));

    const script = serializeCarouselBrief({ slides });
    const parsed = preparePastedCarouselScript(script);

    expect(parsed).toMatchObject({ ok: true, blockCount: 12, slideCount: 6 });
    expect(parsed.blocks).toEqual(slides.flatMap((slide) => [slide.headline, slide.body]));
    expect(script).toContain('texto 1 - Título 1');
    expect(script).toContain('texto 12 - Corpo 6');
  });

  it('usa readerTakeaway quando body está vazio e preserva dois campos por slide', () => {
    const slides = Array.from({ length: 6 }, (_, index) => ({
      headline: `Título ${index + 1}`,
      body: index % 2 === 0 ? '   ' : `Corpo ${index + 1}`,
      readerTakeaway: `Aprendizado ${index + 1}`
    }));

    const parsed = preparePastedCarouselScript(serializeCarouselBrief({ slides }));

    expect(parsed).toMatchObject({ ok: true, blockCount: 12, slideCount: 6 });
    expect(parsed.blocks).toEqual([
      'Título 1', 'Aprendizado 1',
      'Título 2', 'Corpo 2',
      'Título 3', 'Aprendizado 3',
      'Título 4', 'Corpo 4',
      'Título 5', 'Aprendizado 5',
      'Título 6', 'Corpo 6'
    ]);
  });
});
