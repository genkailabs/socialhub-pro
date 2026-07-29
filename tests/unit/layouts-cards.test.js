import { describe, expect, it } from 'vitest';
import {
  STRUCTURES, structureById, structureCard, structureNeedsPhoto,
  structureTextLevel, filterStructures, structureCategories
} from '@/lib/layouts/structures';

describe('ficha da estrutura para a Biblioteca (PRD 02 §11)', () => {
  it('toda estrutura produz uma ficha completa', () => {
    for (const s of STRUCTURES) {
      const card = structureCard(s);
      expect(card.id, s.id).toBe(s.id);
      expect(card.label, s.id).toBeTruthy();
      expect(card.recommendedFor, s.id).toBeTruthy();
      expect(['pouco', 'medio', 'muito'], s.id).toContain(card.textLevel);
      expect(card.shapes.length, s.id).toBeGreaterThan(0);
    }
  });

  // "Precisa de foto" é DEDUZIDO do que a estrutura exige. Declarado à mão
  // sairia do lugar no primeiro slot removido.
  it('deduz a necessidade de foto do proprio contrato da estrutura', () => {
    expect(structureNeedsPhoto(structureById('hero-editorial'))).toBe(true);
    expect(structureNeedsPhoto(structureById('manchete'))).toBe(false);
    for (const s of STRUCTURES) {
      expect(structureNeedsPhoto(s), s.id).toBe(Boolean(s.requires?.image));
    }
  });

  it('mede a quantidade de texto pelos blocos de texto da peca', () => {
    // Hero tem título e apoio: pouco texto, muita foto.
    expect(structureTextLevel(structureById('hero-editorial'))).toBe('pouco');
    // Lista tem quatro itens mais título: é a peça mais densa do catálogo.
    expect(structureTextLevel(structureById('lista'))).toBe('muito');
  });

  it('ficha de estrutura inexistente e nula, nao um objeto vazio', () => {
    expect(structureCard(null)).toBeNull();
  });
});

describe('filtros da Biblioteca (§11)', () => {
  it('sem filtro devolve o catalogo inteiro', () => {
    expect(filterStructures()).toHaveLength(STRUCTURES.length);
  });

  it('filtra por precisar de foto, nos dois sentidos', () => {
    const comFoto = filterStructures({ needsPhoto: true });
    const semFoto = filterStructures({ needsPhoto: false });
    expect(comFoto.length).toBeGreaterThan(0);
    expect(semFoto.length).toBeGreaterThan(0);
    expect(comFoto.length + semFoto.length).toBe(STRUCTURES.length);
    for (const s of semFoto) expect(structureNeedsPhoto(s), s.id).toBe(false);
  });

  it('filtra as pecas pensadas para foto de pessoa', () => {
    const ids = filterStructures({ withPerson: true }).map((s) => s.id);
    expect(ids).toContain('manchete-pessoa');
    expect(ids).toContain('retrato-corporativo');
    expect(ids).not.toContain('lista');
  });

  it('filtra por categoria e por formato, e combina filtros', () => {
    expect(filterStructures({ category: 'anuncio' }).map((s) => s.id)).toEqual(['anuncio-foto']);
    // retrato-corporativo só existe em quadrado: não aparece no story.
    expect(filterStructures({ shape: 'story' }).map((s) => s.id)).not.toContain('retrato-corporativo');
    const combinado = filterStructures({ category: 'editorial', needsPhoto: true });
    for (const s of combinado) {
      expect(s.category).toBe('editorial');
      expect(structureNeedsPhoto(s)).toBe(true);
    }
  });

  it('lista as categorias a partir do catalogo, sem lista fixa', () => {
    const cats = structureCategories();
    expect(cats).toContain('anuncio');
    expect(cats).toContain('minimalista');
    expect(new Set(cats).size).toBe(cats.length);
  });
});
