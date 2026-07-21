import { describe, expect, it } from 'vitest';
import {
  FORMATS, formatById, plannableFormats, publishableFormats,
  isPublishable, needsManualPosting, formatIds, producerOf
} from '@/lib/formats';

describe('registro de formatos', () => {
  it('cobre os quatro formatos do Instagram', () => {
    expect(formatIds().sort()).toEqual(['carousel', 'image', 'reel', 'stories']);
  });

  // MVP V2 §12: o MVP agora planeja e publica Reels.
  it('o MVP planeja imagem, carrossel, stories e reel', () => {
    expect(plannableFormats().map((f) => f.id).sort()).toEqual(['carousel', 'image', 'reel', 'stories']);
  });

  // MVP V2: Story virou arte estatica, entao o sistema tambem publica.
  it('imagem, carrossel, stories e reel publicam automaticamente', () => {
    expect(publishableFormats().map((f) => f.id).sort()).toEqual(['carousel', 'image', 'reel', 'stories']);
  });

  it('nenhum formato exige postagem manual', () => {
    expect(needsManualPosting('reel')).toBe(false);
    expect(needsManualPosting('stories')).toBe(false);
    expect(needsManualPosting('image')).toBe(false);
  });

  it('formato desconhecido nao vira publicavel por acidente', () => {
    expect(isPublishable('tiktok_dance')).toBe(false);
    expect(formatById('tiktok_dance')).toBeNull();
  });

  // A promessa arquitetural: ligar Reels = virar a flag, sem tocar em skill.
  it('publicavel exige um publicador declarado', () => {
    for (const f of publishableFormats()) {
      expect(f.publisher, `formato ${f.id} publicavel sem publicador`).toBeTruthy();
    }
  });

  it('formato sem publicador nao e publicavel', () => {
    for (const f of FORMATS) {
      if (!f.publisher) expect(f.publishable, `formato ${f.id} sem publicador mas marcado publicavel`).toBe(false);
    }
  });

  it('todo formato planejavel tem uma skill que o produz', () => {
    for (const f of plannableFormats()) {
      expect(producerOf(f.id), `formato ${f.id} sem skill produtora`).toBeTruthy();
    }
  });

  it('todo formato tem rotulo em linguagem simples', () => {
    for (const f of FORMATS) {
      expect(f.label, `formato ${f.id} sem rotulo`).toBeTruthy();
      expect(f.label).not.toMatch(/[A-Z_]{4,}/); // nada de CAROUSEL_ALBUM na tela
    }
  });

  it('formatById devolve o formato pedido', () => {
    expect(formatById('carousel')).toMatchObject({ id: 'carousel', publishable: true });
    expect(formatById('reel')).toMatchObject({ id: 'reel', publishable: true });
  });
});
