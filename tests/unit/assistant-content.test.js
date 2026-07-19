import { describe, expect, it } from 'vitest';
import { assistantFormat, formatDetails, recommendationBrief } from '@/lib/assistant-content';

describe('conteudo do assistente de marketing', () => {
  it('leva o plano recomendado para um briefing fechado', () => {
    const brief = recommendationBrief({ contentPlan: { format: 'carousel', topic: 'Duvidas sobre implantes', objective: 'educar' } });
    expect(brief).toMatchObject({ format: 'Carrossel para Instagram', topic: 'Duvidas sobre implantes', goal: 'educar' });
  });

  it('identifica os quatro formatos aceitos', () => {
    expect(assistantFormat('Post de imagem')).toBe('post');
    expect(assistantFormat('Carrossel')).toBe('carousel');
    expect(assistantFormat('Reel')).toBe('reel');
    expect(assistantFormat('Stories')).toBe('stories');
  });

  it('monta uma estrutura de carrossel quando a IA nao detalhar paginas', () => {
    const details = formatDetails({ headline: 'Capa', bullets: ['Ponto um', 'Ponto dois'] }, 'carousel');
    expect(details.pages).toHaveLength(3);
    expect(details.pages[1].text).toBe('Ponto um');
  });
});
