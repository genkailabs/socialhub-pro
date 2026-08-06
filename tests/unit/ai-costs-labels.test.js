import { describe, expect, it } from 'vitest';
import { actionLabel, costPeriodStart } from '@/lib/ai-costs-labels';

describe('actionLabel', () => {
  it('traduz skill_id conhecido', () => {
    expect(actionLabel({ skill_id: 'editorial-planner' })).toBe('Planejamento semanal');
    expect(actionLabel({ skill_id: 'post-producer' })).toBe('Produção de post');
  });

  it('cai no kind quando não há skill_id mapeado', () => {
    expect(actionLabel({ skill_id: null, kind: 'research' })).toBe('Pesquisa de contexto');
    expect(actionLabel({ kind: 'image' })).toBe('Geração de imagem');
  });

  // As três do carrossel e a busca de tendência já aparecem em generation_jobs
  // (e agora têm teto em ai_limits): sem rótulo, o filtro de /ai-costs e a
  // mensagem de limite mostravam o id cru.
  it('traduz as ações do carrossel e da busca de tendência', () => {
    expect(actionLabel({ skill_id: 'carousel-assuntos' })).toBe('Busca de assunto do carrossel');
    expect(actionLabel({ skill_id: 'carousel-directions' })).toBe('Promessas de capa do carrossel');
    expect(actionLabel({ skill_id: 'carousel-full-brief' })).toBe('Roteiro de carrossel');
    expect(actionLabel({ skill_id: 'carousel-image' })).toBe('Imagem do carrossel');
    expect(actionLabel({ skill_id: 'instagram-trends' })).toBe('Busca de tendências');
  });

  it('mostra o valor cru quando nada é conhecido', () => {
    expect(actionLabel({ skill_id: 'algo-novo' })).toBe('algo-novo');
    expect(actionLabel({})).toBe('—');
  });
});

describe('costPeriodStart', () => {
  const now = new Date('2026-07-20T12:00:00Z');

  it('7d volta uma semana', () => {
    expect(costPeriodStart('7d', now)).toBe('2026-07-13T12:00:00.000Z');
  });

  it('mês começa no dia 1', () => {
    expect(costPeriodStart('month', now)).toBe('2026-07-01T00:00:00.000Z');
  });

  it('all não filtra (null)', () => {
    expect(costPeriodStart('all', now)).toBe(null);
    expect(costPeriodStart(null, now)).toBe(null);
  });
});
