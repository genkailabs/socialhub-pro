import { cn } from '@/lib/utils';

/**
 * Cabeçalho de seção do Aurora Grid: um rótulo miúdo em caixa alta, o título
 * logo abaixo e a ação da seção à direita.
 *
 * O rótulo existe para o olho achar a seção sem ler o título — é a única peça
 * do sistema que usa caixa alta com espaçamento entre letras, então ele não
 * disputa com nada. `tone` pinta o rótulo pelo papel da seção: `accent` para o
 * que a pessoa cria, `cyan` para o que o Hub descobre, `lime` para o que já foi
 * aprovado.
 */
const LABEL_TONES = {
  muted: 'text-faint',
  accent: 'text-accent-ink',
  cyan: 'text-cyan-ink',
  lime: 'text-success'
};

export function SectionHeading({
  label,
  tone = 'muted',
  title,
  description,
  action,
  as: Tag = 'h2',
  className = ''
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {label && (
          <p className={cn('text-[10.5px] font-bold uppercase tracking-[0.12em]', LABEL_TONES[tone] || LABEL_TONES.muted)}>
            {label}
          </p>
        )}
        <Tag className="mt-1 text-[19px] font-bold leading-tight tracking-tight text-ink">{title}</Tag>
        {description && <p className="mt-1 text-[13px] leading-[19px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
