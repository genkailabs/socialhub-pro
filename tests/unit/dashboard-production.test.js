import { describe, it, expect } from 'vitest';
import {
  formatLabelOf, hrefOf, productionCounts, productionQueue, toProductionItem
} from '@/lib/dashboard-production';
import { relativeFromNow, scheduleLabel } from '@/lib/relative-time';

const carrossel = (slides) => ({
  editorState: { format: 'carrossel', doc: { carrossel: { slides: Array.from({ length: slides }) } } }
});

describe('formatLabelOf', () => {
  it('conta os slides do carrossel e ignora a contagem nos outros formatos', () => {
    expect(formatLabelOf({ production: carrossel(8) })).toBe('Carrossel · 8 slides');
    expect(formatLabelOf({ production: { editorState: { format: 'reel' } } })).toBe('Reel');
  });

  it('post antigo, sem editorState, nao vira "undefined"', () => {
    expect(formatLabelOf({ id: 'p1' })).toBe('Post');
  });
});

describe('hrefOf', () => {
  it('manda o publicado para a revisao e o rascunho para o editor certo', () => {
    expect(hrefOf({ id: 'p1', status: 'published' })).toBe('/content/p1/review');
    expect(hrefOf({ id: 'p2', status: 'draft', production: carrossel(6) }))
      .toBe('/composer?format=carrossel&post=p2');
    expect(hrefOf({ id: 'p3', status: 'draft' })).toBe('/composer?post=p3');
  });
});

describe('toProductionItem', () => {
  it('usa a primeira linha da legenda quando nao ha titulo', () => {
    const item = toProductionItem({ id: 'p1', status: 'draft', content: '\n  Como usar IA no atendimento\nsegunda linha' });
    expect(item.title).toBe('Como usar IA no atendimento');
  });

  it('cai em "Sem titulo" quando nao ha titulo nem legenda', () => {
    expect(toProductionItem({ id: 'p1', status: 'draft' }).title).toBe('Sem título');
  });
});

describe('productionCounts', () => {
  it('soma "pronto p/ postar" junto de agendado, porque os dois ja sairam da mesa', () => {
    const counts = productionCounts([
      { status: 'draft' }, { status: 'draft' },
      { status: 'waiting_approval' },
      { status: 'scheduled' }, { status: 'ready_to_post' },
      { status: 'published' }, { status: 'posted_manually' }
    ]);
    expect(counts).toEqual({ drafts: 2, review: 1, scheduled: 2, published: 2 });
  });
});

describe('productionQueue', () => {
  it('ordena por proximidade da publicacao e deixa o publicado de fora', () => {
    const queue = productionQueue([
      { id: 'rascunho', status: 'draft', created_at: '2026-08-01T10:00:00Z' },
      { id: 'publicado', status: 'published', created_at: '2026-08-01T10:00:00Z' },
      { id: 'agendado', status: 'scheduled', scheduled_at: '2026-08-06T10:00:00Z' },
      { id: 'revisao', status: 'waiting_approval', created_at: '2026-08-02T10:00:00Z' }
    ]);
    expect(queue.map((item) => item.id)).toEqual(['agendado', 'revisao', 'rascunho']);
  });
});

describe('relativeFromNow', () => {
  const now = new Date('2026-08-05T12:00:00Z');

  it('fala em minutos, horas e dias conforme a distancia', () => {
    expect(relativeFromNow('2026-08-05T11:46:00Z', now)).toBe('há 14 min');
    expect(relativeFromNow('2026-08-05T09:00:00Z', now)).toBe('há 3 h');
    expect(relativeFromNow('2026-08-04T09:00:00Z', now)).toBe('ontem');
    expect(relativeFromNow('2026-08-02T09:00:00Z', now)).toBe('há 3 dias');
  });

  it('nao inventa passado para data futura', () => {
    expect(relativeFromNow('2026-08-05T13:00:00Z', now)).toBe('em instantes');
  });
});

describe('scheduleLabel', () => {
  it('nomeia hoje e amanha, e cai na data nos demais dias', () => {
    const now = new Date(2026, 7, 5, 12, 0);
    expect(scheduleLabel(new Date(2026, 7, 5, 20, 30), now)).toBe('Hoje, 20:30');
    expect(scheduleLabel(new Date(2026, 7, 6, 9, 0), now)).toBe('Amanhã, 09:00');
    expect(scheduleLabel(new Date(2026, 7, 9, 9, 0), now)).toContain('09:00');
    expect(scheduleLabel(null, now)).toBe('Sem data');
  });
});
