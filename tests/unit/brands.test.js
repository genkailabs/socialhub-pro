import { describe, it, expect } from 'vitest';
import { brandFromRow, validateBrandName } from '@/lib/brands';

describe('brandFromRow', () => {
  it('mapeia linha do DB para shape da app com defaults', () => {
    const row = { id: 'b1', name: 'Genkai Labs', color: null, category: null, handle: null };
    expect(brandFromRow(row)).toEqual({
      id: 'b1', name: 'Genkai Labs', handle: '@genkailabs', category: 'Geral', color: '#007AFF'
    });
  });
  it('preserva handle/category/color quando presentes', () => {
    const row = { id: 'b2', name: 'Acme', handle: '@acme', category: 'Varejo', color: '#FF0000' };
    expect(brandFromRow(row)).toMatchObject({ handle: '@acme', category: 'Varejo', color: '#FF0000' });
  });
});

describe('validateBrandName', () => {
  it('retorna nome aparado quando válido', () => {
    expect(validateBrandName('  Minha Marca  ')).toBe('Minha Marca');
  });
  it('lança quando vazio ou curto demais', () => {
    expect(() => validateBrandName('  ')).toThrow();
    expect(() => validateBrandName('a')).toThrow();
  });
});
