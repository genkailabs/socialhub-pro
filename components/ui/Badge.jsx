import { cn } from '@/lib/utils';

// Selo/pílula padrão. As tonalidades reaproveitam exatamente as classes já
// usadas hoje (ex.: StatusBadge do Planejamento) — nada de visual novo (RF-16).
const TONES = {
  muted: 'bg-line text-muted',
  success: 'bg-success/10 text-success',
  accent: 'bg-accent/10 text-accent'
};

export function Badge({ tone = 'muted', className = '', children, ...props }) {
  return (
    <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', TONES[tone] || TONES.muted, className)} {...props}>
      {children}
    </span>
  );
}
