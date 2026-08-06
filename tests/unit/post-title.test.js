import { describe, expect, it } from 'vitest';
import { postTitle } from '@/lib/post-title';

describe('título do post na grade', () => {
  it('tira a marcação que vazava para o Calendário', () => {
    expect(postTitle('**🔺 Seus posts não crescem sozinhos**', 40)).toBe('🔺 Seus posts não crescem sozinhos');
  });

  it('usa a primeira linha com texto, e não a linha em branco', () => {
    expect(postTitle('\n\n## Título de verdade\nresto da legenda', 40)).toBe('Título de verdade');
  });

  it('corta pelo tamanho pedido e avisa que continua', () => {
    expect(postTitle('a'.repeat(30), 14)).toBe(`${'a'.repeat(14)}…`);
  });

  it('não corta o que já cabe', () => {
    expect(postTitle('Post curto', 40)).toBe('Post curto');
  });

  it('desfaz negrito, itálico, lista e link', () => {
    expect(postTitle('- [Guia completo](https://x.com) com _dicas_ e `código`', 80))
      .toBe('Guia completo com dicas e código');
  });

  it('cai no rótulo de reserva quando não sobra texto', () => {
    expect(postTitle('   ', 40, 'Rascunho')).toBe('Rascunho');
    expect(postTitle(null, 40)).toBe('Post');
  });
});
