import { describe, expect, it } from 'vitest';
import { fitMediaToCanvas } from '@/lib/composer-editor';
import { structureById } from '@/lib/layouts/structures';

const RETRATO = { width: 1000, height: 1500 };
const PAISAGEM = { width: 1500, height: 1000 };
const QUADRADO = [1080, 1080];

describe('encaixe da mídia no canvas (PRD 02 §10)', () => {
  // O padrão é o que sempre valeu: nada de mudança silenciosa em upload comum.
  it('sem opções mostra a foto inteira e centralizada', () => {
    const bg = fitMediaToCanvas(RETRATO, QUADRADO);
    expect(bg.h).toBe(1080);
    expect(bg.w).toBe(720);
    expect(bg.x).toBe(180);
    expect(bg.y).toBe(0);
    // Contain nunca ultrapassa o quadro.
    expect(bg.w).toBeLessThanOrEqual(QUADRADO[0]);
    expect(bg.h).toBeLessThanOrEqual(QUADRADO[1]);
  });

  it('cover preenche o quadro inteiro, sem sobrar tarja', () => {
    const bg = fitMediaToCanvas(RETRATO, QUADRADO, { mode: 'cover' });
    expect(bg.w).toBeGreaterThanOrEqual(QUADRADO[0]);
    expect(bg.h).toBeGreaterThanOrEqual(QUADRADO[1]);
  });

  // A âncora decide qual parte sobrevive ao corte. Numa foto vertical de
  // pessoa, centralizar come testa e queixo; topo mantém o rosto.
  // Retrato num quadro quadrado é o caso onde a âncora decide algo: sobra
  // altura. Paisagem sobra largura, e aí não há o que ancorar na vertical.
  it('ancora no topo mantem a parte de cima da foto visivel', () => {
    const centro = fitMediaToCanvas(RETRATO, QUADRADO, { mode: 'cover' });
    const topo = fitMediaToCanvas(RETRATO, QUADRADO, { mode: 'cover', anchor: 'topo' });
    expect(topo.y).toBe(0);
    // Centralizado, a foto sobe (y negativo) e perde o topo.
    expect(centro.y).toBeLessThan(0);
    expect(topo.y).toBeGreaterThan(centro.y);
    expect(topo.h).toBe(centro.h);
  });

  it('ancora nao muda nada quando a foto ja cabe na altura', () => {
    const bg = fitMediaToCanvas(RETRATO, QUADRADO, { mode: 'contain', anchor: 'topo' });
    expect(bg.y).toBe(0);
  });

  // Paisagem em quadro quadrado sobra na largura: a âncora vertical não tem
  // efeito, e não pode inventar um.
  it('foto em paisagem nao e afetada pela ancora vertical', () => {
    const centro = fitMediaToCanvas(PAISAGEM, QUADRADO, { mode: 'cover' });
    const topo = fitMediaToCanvas(PAISAGEM, QUADRADO, { mode: 'cover', anchor: 'topo' });
    expect(topo.y).toBe(centro.y);
  });
});

describe('estruturas que pedem enquadramento inteligente', () => {
  // O contrato que a interface lê: sem esses campos o encaixe nem muda.
  it('os templates de foto declaram como a peca usa a imagem', () => {
    expect(structureById('manchete-pessoa').faceZone).toBe('topo');
    expect(structureById('hero-editorial').faceZone).toBe('topo');
    expect(structureById('hero-editorial').inkOverImage).toBe(true);
    // Peça sem foto protagonista não declara zona de rosto.
    expect(structureById('lista').faceZone).toBeUndefined();
    expect(structureById('manchete').faceZone).toBeUndefined();
  });
});
