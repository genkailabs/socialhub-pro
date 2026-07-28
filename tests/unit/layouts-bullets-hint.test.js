import { describe, expect, it } from 'vitest';
import { MAX_BULLET_SLIDES, bulletsHint, countBullets } from '@/lib/layouts/bullets-hint';
import { structureById } from '@/lib/layouts/structures';

// O campo escondia a regra: o usuário tinha que adivinhar que 2 linhas viram
// comparação e 3 viram lista. O aviso resolve isso, mas só vale se disser a
// verdade — prometer estrutura que o motor escolhe por pontuação seria pior
// que o silêncio de antes.

const linhas = (n) => Array.from({ length: n }, (_, i) => `item ${i + 1}`).join('\n');

describe('countBullets', () => {
  it('conta linhas com conteúdo e ignora as vazias', () => {
    expect(countBullets('a\n\n  \nb')).toBe(2);
    expect(countBullets('')).toBe(0);
    expect(countBullets(null)).toBe(0);
  });
});

describe('Carrossel: a conta de slides é determinística, então pode ser afirmada', () => {
  const hint = (n) => bulletsHint({ text: linhas(n), format: 'carrossel' });

  it('sem itens, monta um slide só', () => {
    expect(hint(0).message).toBe('Sem itens: monta um slide só.');
  });

  it('cada item vira um slide, mais a capa', () => {
    expect(hint(1).message).toBe('1 item · viram 2 slides (capa + 1).');
    expect(hint(3).message).toBe('3 itens · viram 4 slides (capa + 3).');
  });

  it('no limite, ainda cabe', () => {
    const limite = hint(MAX_BULLET_SLIDES);
    expect(limite.message).toContain(`${MAX_BULLET_SLIDES + 1} slides`);
    expect(limite.tone).toBe('ok');
  });

  it('passando do limite, avisa que o resto é descartado', () => {
    const estourado = hint(MAX_BULLET_SLIDES + 1);
    expect(estourado.message).toContain(`Só os ${MAX_BULLET_SLIDES} primeiros`);
    expect(estourado.tone).toBe('alerta');
  });

  // O teto do aviso e o do motor precisam ser o mesmo número, senão a
  // interface promete um slide que composeSmartCarousel não monta.
  it('o teto vem do limite real do Instagram', () => {
    expect(MAX_BULLET_SLIDES).toBe(9);
  });
});

describe('A IA escolhe: habilita, nunca promete', () => {
  const hint = (n) => bulletsHint({ text: linhas(n), format: 'post' });

  it('sem itens, diz o que a arte terá', () => {
    expect(hint(0).message).toBe('Sem itens: a arte sai com título e subtítulo.');
  });

  it('com um item, diz o que falta', () => {
    expect(hint(1).message).toContain('com mais um');
  });

  it('dois itens habilitam Comparação', () => {
    expect(hint(2).message).toBe('2 itens · habilita o layout de Comparação.');
  });

  it('três ou mais habilitam Lista', () => {
    expect(hint(3).message).toBe('3 itens · habilita o layout de Lista.');
    expect(hint(7).message).toBe('7 itens · habilita o layout de Lista.');
  });

  // A escolha sai de scoreStructure, que é pontuação, e a antirrepetição pode
  // desviar. "Vira" seria mentira; só "habilita" é verificável.
  it('nunca afirma que a estrutura sairá', () => {
    for (const n of [0, 1, 2, 3, 9]) {
      expect(hint(n).message).not.toMatch(/\bvira uma\b/);
    }
  });
});

describe('Manual: a estrutura é forçada, então o requisito vira alerta', () => {
  const hint = (n, structureId) => bulletsHint({ text: linhas(n), format: 'post', structureId });

  it('Lista com menos de 3 itens avisa o que falta', () => {
    const r = hint(1, 'lista');
    expect(r.message).toBe(`${structureById('lista').label} precisa de 3 itens — você tem 1.`);
    expect(r.tone).toBe('alerta');
  });

  it('Lista com 3 itens está satisfeita', () => {
    const r = hint(3, 'lista');
    expect(r.tone).toBe('ok');
    expect(r.message).toContain('vai usar todos');
  });

  // comparativo declara minBullets e maxBullets iguais a 2.
  it('Comparativo exige exatamente dois', () => {
    expect(hint(2, 'comparativo').tone).toBe('ok');
    expect(hint(3, 'comparativo').tone).toBe('alerta');
    expect(hint(3, 'comparativo').message).toContain('exatamente 2 itens');
    expect(hint(1, 'comparativo').tone).toBe('alerta');
  });

  it('estrutura que não usa itens não cobra nada', () => {
    const r = hint(0, 'manchete');
    expect(r.tone).toBe('neutro');
    expect(r.message).toContain('não precisa de itens');
  });

  it('em Carrossel, a contagem de slides vence a estrutura manual', () => {
    const r = bulletsHint({ text: linhas(3), format: 'carrossel', structureId: 'lista' });
    expect(r.message).toContain('4 slides');
  });
});
