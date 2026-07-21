import { Sparkles } from 'lucide-react';

/**
 * Indicador padrão para carregamentos de página e operações demoradas.
 * A composição circular mantém o aspecto criativo do SocialHub sem depender
 * de imagens externas.
 */
export function LoadingIndicator({ label = 'Carregando', description, compact = false, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'gap-2' : 'min-h-[280px] gap-4'} ${className}`} role="status" aria-live="polite">
      <div className={`relative grid place-items-center rounded-full ${compact ? 'h-9 w-9' : 'h-28 w-28'} bg-surface-2`}>
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 animate-socialhub-loader rounded-full border-2 border-transparent border-t-accent border-r-accent-soft" />
        <div className={`grid place-items-center rounded-full bg-surface shadow-soft ${compact ? 'h-6 w-6' : 'h-20 w-20'}`}>
          <Sparkles className={`${compact ? 'h-3 w-3' : 'h-7 w-7'} animate-pulse text-accent`} aria-hidden="true" />
        </div>
      </div>
      <div>
        <p className={`${compact ? 'text-xs' : 'text-base'} font-extrabold text-ink`}>{label}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <span className="sr-only">Aguarde, carregamento em andamento.</span>
    </div>
  );
}
