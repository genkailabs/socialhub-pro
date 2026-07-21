import { nextScheduledAt } from '@/lib/autopilot-schedule';

// Aprovar agenda o post no proximo horario preferido da marca. Sem horarios
// validos, nextScheduledAt cai para as 09:00 de Sao Paulo.
export function approvalUpdate({ action, preferredTimes, now }) {
  if (action !== 'approved') return { status: null, scheduledAt: null };
  return {
    status: 'scheduled',
    scheduledAt: nextScheduledAt(preferredTimes, now)
  };
}
