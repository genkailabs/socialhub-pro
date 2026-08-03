import { describe, expect, it } from 'vitest';
import { brandKitToStudioBrand } from '@/lib/carrossel-studio-data';

// O Brand Kit guarda a paleta com nome de papel ({ accent, bg, surface, ink }).
// O Studio pede os mesmos papéis com outro nome. Ler a paleta pela ORDEM das
// chaves entregava a cor de superfície como tinta do texto — o texto nascia
// quase invisível sobre o fundo e ninguém entendia por quê.
describe('paleta do Brand Kit virando tokens do Studio', () => {
  const kit = {
    palette: { accent: '#c9fa4b', bg: '#0b0b0d', surface: '#16171a', ink: '#f6f5f2' }
  };

  it('leva cada cor para o papel de mesmo nome, não para a posição', () => {
    const { tokens } = brandKitToStudioBrand(kit, 'GenkaiLabs', 'genkailabs');

    expect(tokens['brand-accent']).toBe('#c9fa4b');
    expect(tokens['brand-bg']).toBe('#0b0b0d');
    expect(tokens['brand-ink']).toBe('#f6f5f2');
    expect(tokens['surface-card']).toBe('#16171a');
  });

  it('a ordem das chaves no banco não muda o resultado', () => {
    const embaralhado = { palette: { ink: '#f6f5f2', surface: '#16171a', bg: '#0b0b0d', accent: '#c9fa4b' } };

    expect(brandKitToStudioBrand(embaralhado, 'M', '@m').tokens)
      .toEqual(brandKitToStudioBrand(kit, 'M', '@m').tokens);
  });

  it('paleta antiga em lista continua valendo, na ordem em que foi salva', () => {
    const lista = { palette: ['#111111', '#222222', '#333333'] };

    const { tokens } = brandKitToStudioBrand(lista, 'M', '@m');

    expect(tokens['brand-accent']).toBe('#111111');
    expect(tokens['brand-bg']).toBe('#222222');
    expect(tokens['brand-ink']).toBe('#333333');
  });

  it('ignora valor que não é cor, em vez de mandar lixo para o Studio', () => {
    const sujo = { palette: { accent: 'azul', bg: '#0b0b0d', ink: '' } };

    const { tokens } = brandKitToStudioBrand(sujo, 'M', '@m');

    expect(tokens['brand-accent']).toBeUndefined();
    expect(tokens['brand-bg']).toBe('#0b0b0d');
    expect(tokens['brand-ink']).toBeUndefined();
  });

  it('marca sem paleta não inventa cor nenhuma', () => {
    expect(brandKitToStudioBrand(null, 'M', '@m').tokens).toEqual({});
  });

  it('mantém @, nome e copyright da marca', () => {
    const brand = brandKitToStudioBrand(kit, 'GenkaiLabs', 'genkailabs');

    expect(brand.handle).toBe('@genkailabs');
    expect(brand.name).toBe('GenkaiLabs');
    expect(brand.copyright).toContain('GenkaiLabs');
  });
});
