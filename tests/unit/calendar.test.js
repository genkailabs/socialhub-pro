import { describe, it, expect } from 'vitest';
import { monthMatrix, groupPostsByDay, statusMeta } from '@/lib/calendar';

describe('monthMatrix', () => {
  it('julho/2026 começa numa quarta e tem 31 dias', () => {
    const m = monthMatrix(2026, 6); // mês 0-based: 6 = julho
    const flat = m.flat();
    expect(flat.length % 7).toBe(0);
    const days = flat.filter((d) => d && d.inMonth);
    expect(days.length).toBe(31);
    expect(days[0].date.getDay()).toBe(3); // 1/jul/2026 = quarta
  });
});

describe('groupPostsByDay', () => {
  it('agrupa por YYYY-MM-DD do scheduled_at', () => {
    const posts = [
      { id: 'a', scheduled_at: '2026-07-10T12:00:00Z' },
      { id: 'b', scheduled_at: '2026-07-10T18:00:00Z' },
      { id: 'c', scheduled_at: '2026-07-11T09:00:00Z' }
    ];
    const g = groupPostsByDay(posts);
    expect(g['2026-07-10'].map((p) => p.id)).toEqual(['a', 'b']);
    expect(g['2026-07-11'].length).toBe(1);
  });
});

describe('statusMeta', () => {
  it('mapeia status para rótulo e cor', () => {
    expect(statusMeta('published').label).toBe('Publicado');
    expect(statusMeta('scheduled').label).toBe('Agendado');
    expect(statusMeta('desconhecido').label).toBe('Rascunho');
  });
});
