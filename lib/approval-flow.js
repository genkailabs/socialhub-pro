import { nextScheduledAt } from '@/lib/autopilot-schedule';

export function approvalUpdate({ action, now }) {
  if (action !== 'approved') return { status: null, scheduledAt: null };
  return {
    status: 'scheduled',
    scheduledAt: nextScheduledAt(['09:00'], now)
  };
}
