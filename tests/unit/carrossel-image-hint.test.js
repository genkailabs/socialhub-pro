import { describe, expect, it } from 'vitest';
import { imageHintForSlide, imageHintsForBlocks, imageHintsForSlides } from '@/lib/carrossel-image-hint';

describe('dica de imagem do slide', () => {
  it('usa a dica escrita pela IA quando ela vem inteira', () => {
    const hint = imageHintForSlide({
      role: 'teach',
      headline: 'Qualquer coisa',
      imageIdea: { scene: 'duas pessoas revisando um contrato na mesa', searchTerms: ['contract', 'meeting'], avoid: 'foto de banco de imagem sorrindo demais' }
    });

    expect(hint.source).toBe('ai');
    expect(hint.scene).toBe('duas pessoas revisando um contrato na mesa');
    expect(hint.query).toContain('contract meeting');
    expect(hint.avoid).toBe('foto de banco de imagem sorrindo demais');
  });

  it('ignora dica pela metade e monta a local', () => {
    const hint = imageHintForSlide({
      role: 'teach',
      headline: 'Cinco erros ao usar IA no escritório',
      imageIdea: { scene: 'só a cena, sem termos', searchTerms: ['office'] }
    });

    expect(hint.source).toBe('local');
  });

  it('lê o assunto do texto do slide e devolve termos em inglês', () => {
    const hint = imageHintForSlide({
      role: 'teach',
      headline: 'Cinco erros ao usar inteligência artificial no escritório',
      body: 'A equipe adota a ferramenta sem combinar quem revisa o resultado.'
    });

    expect(hint.source).toBe('local');
    expect(hint.scene).toMatch(/IA aberta na tela/);
    expect(hint.query).toContain('artificial intelligence');
    expect(hint.query).toContain('office');
    expect(hint.searchTerms.every((term) => /^[a-z-]+$/i.test(term))).toBe(true);
  });

  it('a capa pede espaço vazio para a manchete', () => {
    const comTema = imageHintForSlide({ role: 'cover', headline: 'O erro que faz o time perder vendas' });
    const semTema = imageHintForSlide({ role: 'cover', headline: 'Aquilo' });

    expect(comTema.scene).toMatch(/espaço vazio em cima/);
    expect(comTema.query).toContain('copy space');
    expect(semTema.query).toContain('copy space');
  });

  it('o CTA pede alguém decidindo o próximo passo', () => {
    const hint = imageHintForSlide({ role: 'cta', headline: 'Comece hoje' });

    expect(hint.scene).toMatch(/celular/);
    expect(hint.query).toContain('smartphone');
  });

  it('sempre devolve cena, termos e o que evitar, mesmo sem texto', () => {
    const hint = imageHintForSlide(null);

    expect(hint.scene.length).toBeGreaterThan(0);
    expect(hint.searchTerms.length).toBeGreaterThanOrEqual(2);
    expect(hint.avoid).toMatch(/texto, logo ou gráfico/);
  });

  it('a busca já leva a direção editorial que combina com texto por cima', () => {
    const hint = imageHintForSlide({ role: 'teach', headline: 'Rotina da equipe' });

    expect(hint.query).toContain('editorial magazine');
    expect(hint.query).toContain('blurred background');
  });
});

describe('o carrossel inteiro não repete a mesma foto', () => {
  const mesmoTema = [
    { order: 1, role: 'cover', headline: 'Cinco erros ao usar IA no escritório' },
    { order: 2, role: 'traction', headline: 'A equipe adota a IA sem revisar', body: 'O erro chega ao cliente.' },
    { order: 3, role: 'teach', headline: 'A IA no escritório acelera quem sabe o caminho', body: 'A equipe ganha tempo.' },
    { order: 4, role: 'apply', headline: 'Escolha a tarefa de IA mais repetitiva da equipe' },
    { order: 5, role: 'cta', headline: 'Comece esta semana' }
  ];

  it('dá uma cena diferente para cada slide, mesmo falando do mesmo assunto', () => {
    const hints = imageHintsForSlides(mesmoTema);
    const cenas = new Set(hints.map((hint) => hint.scene));
    const buscas = new Set(hints.map((hint) => hint.query));

    expect(hints).toHaveLength(5);
    expect(cenas.size).toBe(5);
    expect(buscas.size).toBe(5);
  });

  it('mantém a dica escrita pela IA intacta no meio da lista', () => {
    const comIa = structuredClone(mesmoTema);
    comIa[2].imageIdea = { scene: 'mesa de reunião vazia', searchTerms: ['empty boardroom', 'daylight'] };
    const hints = imageHintsForSlides(comIa);

    expect(hints[2].source).toBe('ai');
    expect(hints[2].scene).toBe('mesa de reunião vazia');
  });

  it('não quebra com entrada vazia', () => {
    expect(imageHintsForSlides([])).toEqual([]);
    expect(imageHintsForSlides(null)).toEqual([]);
  });
});

describe('dicas para roteiro colado', () => {
  it('monta uma dica por par de campos, começando pela capa', () => {
    const hints = imageHintsForBlocks([
      'CINCO ERROS COM IA NO ESCRITÓRIO',
      'A ferramenta nunca foi o problema.',
      'O time não combina quem revisa',
      'Sem revisor, o erro chega ao cliente.',
      'Comece pela tarefa mais chata',
      'Escolha uma tarefa repetitiva e meça o tempo.'
    ]);

    expect(hints).toHaveLength(3);
    expect(hints[0].order).toBe(1);
    expect(hints[0].query).toContain('copy space');
    expect(hints[2].scene.length).toBeGreaterThan(0);
  });

  it('não quebra com entrada vazia ou ímpar', () => {
    expect(imageHintsForBlocks([])).toEqual([]);
    expect(imageHintsForBlocks(null)).toEqual([]);
    expect(imageHintsForBlocks(['só um bloco'])).toEqual([]);
    expect(imageHintsForBlocks(['título', 'texto', 'sobra'])).toHaveLength(1);
  });
});
