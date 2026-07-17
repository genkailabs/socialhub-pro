import { describe, expect, it } from 'vitest';
import { nextScheduledAt } from '@/lib/autopilot-schedule';

describe('nextScheduledAt', () => {
  it('usa o proximo horario configurado em Sao Paulo', () => {
    const now = new Date('2026-07-15T12:30:00.000Z'); // 09:30 em Sao Paulo
    expect(nextScheduledAt(['09:00', '18:00'], now)).toBe('2026-07-15T21:00:00.000Z');
  });

  it('agenda para o dia seguinte quando os horarios de hoje ja passaram', () => {
    const now = new Date('2026-07-15T22:00:00.000Z'); // 19:00 em Sao Paulo
    expect(nextScheduledAt(['09:00', '18:00'], now)).toBe('2026-07-16T12:00:00.000Z');
  });
});
