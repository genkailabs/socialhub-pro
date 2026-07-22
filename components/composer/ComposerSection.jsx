import { Card } from '@/components/ui/Card';

// Primitivas compartilhadas do Composer. Antes cada bloco do formulário usava
// o mesmo `text-xs font-bold` solto sobre o fundo do app — tudo no mesmo nível
// visual. Aqui o conteúdo passa a viver dentro de cartões numerados, com um
// único padrão de label/nota reaproveitado pelos sub-composers (DESIGN.md §4).

export const fieldClass =
  'w-full rounded-xl border border-line bg-surface-2/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20';

export const dropzoneClass =
  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2/60 px-4 py-8 text-center transition-colors hover:border-accent/60 hover:bg-accent-tint/30 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20';

export function Section({ step, title, hint, aside, children, className = '' }) {
  return (
    <Card as="section" className={`p-5 sm:p-6 ${className}`}>
      {/* flex-wrap: em telas estreitas o controle do lado direito desce para a
          linha de baixo em vez de espremer a descrição em três linhas. */}
      <header className="mb-5 flex flex-wrap items-start gap-x-3 gap-y-3">
        <span
          aria-hidden="true"
          className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent-tint font-mono text-[11px] font-bold tabular-nums text-accent-ink"
        >
          {step}
        </span>
        <div className="min-w-[180px] flex-1">
          <h2 className="text-sm font-bold leading-tight tracking-tight text-ink">{title}</h2>
          {hint && <p className="mt-1 text-xs leading-snug text-muted">{hint}</p>}
        </div>
        {aside}
      </header>
      {children}
    </Card>
  );
}

export function FieldLabel({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-baseline gap-1.5 text-xs font-bold text-ink">
      {children}
      {hint && <span className="font-normal text-faint">{hint}</span>}
    </label>
  );
}

// Avisos operacionais (mídia temporária, limites da Meta): informação de rodapé,
// não alerta. Fica em cinza com filete lateral em vez de uma faixa colorida
// competindo com o conteúdo.
export function Note({ children }) {
  return (
    <p className="border-l-2 border-line-strong pl-3 text-[11px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

export function InlineAlert({ type = 'err', children }) {
  const tone =
    type === 'ok'
      ? 'border-success/30 bg-success-tint text-success'
      : type === 'warn'
        ? 'border-warning/30 bg-warning/10 text-warning'
        : 'border-danger/30 bg-danger/10 text-danger';
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${tone}`}>
      {children}
    </div>
  );
}
