import { cn } from '@/lib/utils';

// Selo/pílula padrão. Os tons seguem os papéis do Aurora Grid: `accent` é o que
// está sendo criado, `cyan` é o que o Hub descobriu, `success` é o que já foi
// aprovado ou publicado. Trocar um pelo outro apaga o código de cor da tela.
const TONES = {
  muted: 'bg-surface-3 text-muted',
  success: 'bg-success/12 text-success',
  accent: 'bg-accent/15 text-accent-ink',
  cyan: 'bg-cyan/12 text-cyan-ink',
  warning: 'bg-warning/15 text-warning-ink',
  danger: 'bg-danger/12 text-danger'
};

export function Badge({ tone = 'muted', className = '', children, ...props }) {
  return (
    <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', TONES[tone] || TONES.muted, className)} {...props}>
      {children}
    </span>
  );
}
