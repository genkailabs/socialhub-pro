import { describe, expect, it } from 'vitest';
import { approvalUpdate } from '@/lib/approval-flow';

describe('approvalUpdate', () => {
  it('agenda um post quando o cliente aprova', () => {
    expect(approvalUpdate({
      action: 'approved',
      preferredTimes: ['18:00'],
      now: new Date('2026-07-15T12:30:00.000Z')
    })).toEqual({
      status: 'scheduled',
      scheduledAt: '2026-07-16T12:00:00.000Z'
    });
  });

  it('usa a rodada diaria das 09:00 no plano gratuito', () => {
    expect(approvalUpdate({
      action: 'approved',
      preferredTimes: ['18:00'],
      now: new Date('2026-07-15T12:30:00.000Z')
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
