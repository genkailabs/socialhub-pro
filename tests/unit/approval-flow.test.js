import { describe, expect, it } from 'vitest';
import { approvalUpdate } from '@/lib/approval-flow';

// Sao Paulo = UTC-3. 12:30Z = 09:30 local, entao 18:00 local ainda esta por vir hoje.
const NOW = new Date('2026-07-15T12:30:00.000Z');

describe('approvalUpdate', () => {
  it('agenda no horario preferido da marca', () => {
    expect(approvalUpdate({
      action: 'approved',
      preferredTimes: ['18:00'],
      now: NOW
    })).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-07-15T21:00:00.000Z' // 18:00 em Sao Paulo, hoje
    });
  });

  it('escolhe o proximo horario da lista, nao o primeiro', () => {
    expect(approvalUpdate({
      action: 'approved',
      preferredTimes: ['08:00', '18:00'], // 08:00 ja passou
      now: NOW
    })).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-07-15T21:00:00.000Z'
    });
  });

  it('cai para as 09:00 quando a marca nao definiu horarios', () => {
    expect(approvalUpdate({
      action: 'approved',
      preferredTimes: [],
      now: NOW
    })).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-07-16T12:00:00.000Z' // 09:00 em Sao Paulo, amanha
    });
  });

  it('cai para as 09:00 quando os horarios sao invalidos', () => {
    expect(approvalUpdate({
      action: 'approved',
      preferredTimes: ['25:00', 'manha'],
      now: NOW
    })).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-07-16T12:00:00.000Z'
    });
  });

  it('nao agenda um post quando o cliente pede ajustes', () => {
    expect(approvalUpdate({ action: 'changes_requested' })).toEqual({
      status: null,
      scheduledAt: null
    });
  });
});
