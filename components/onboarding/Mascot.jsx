import { cn } from '@/lib/utils';

/*
 * Hub — mascote guia da jornada de conteúdo.
 *
 * SVG puro (sem asset externo, sem dependência): herda os tokens do tema via
 * utilitários `fill-*` do Tailwind, então acompanha claro/escuro sozinho. O
 * visor e os olhos usam cores fixas de propósito — é ilustração, não cromo,
 * e precisa do mesmo contraste nos dois temas.
 *
 * Expressões:
 *   'guide' — olhar neutro, sorriso curto, braço direito apontando a etapa.
 *   'cheer' — olhos em arco, sorriso aberto, braços pra cima e faíscas.
 */
export function Mascot({ mood = 'guide', className }) {
  const cheering = mood === 'cheer';

  return (
    <svg
      viewBox="0 0 56 68"
      aria-hidden="true"
      focusable="false"
      className={cn('block overflow-visible', className)}
    >
      {/* Sombra no chão: fica parada enquanto o corpo flutua. */}
      <ellipse cx="28" cy="56" rx="10" ry="2.5" className="fill-ink/10" />

      <g className="animate-mascot-bob">
        {/* Antena */}
        <path d="M28 13V9" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="28" cy="5.5" r="3.5" className="fill-accent animate-mascot-pulse" />

        {/* Braços */}
        <rect
          x="1.5"
          y="26"
          width="7"
          height="15"
          rx="3.5"
          className="fill-accent/80"
          transform={cheering ? 'rotate(-38 5 28)' : undefined}
        />
        <rect
          x="47.5"
          y="26"
          width="7"
          height="15"
          rx="3.5"
          className="fill-accent/80"
          transform={cheering ? 'rotate(38 51 28)' : 'rotate(24 51 28)'}
        />

        {/* Corpo/cabeça */}
        <rect x="8" y="12" width="40" height="34" rx="13" className="fill-accent" />
        {/* Brilho superior — dá volume sem sombra */}
        <rect x="12.5" y="15" width="31" height="11" rx="5.5" className="fill-white/15" />

        {/* Visor */}
        <rect x="13.5" y="20" width="29" height="18" rx="9" fill="#0B1220" />

        {cheering ? (
          <>
            <path d="M19 30.5q3-4 6 0" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M31 30.5q3-4 6 0" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M23 34q5 4.5 10 0" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".85" />
          </>
        ) : (
          <>
            <circle cx="22" cy="29" r="3" fill="#FFFFFF" />
            <circle cx="34" cy="29" r="3" fill="#FFFFFF" />
            <circle cx="23.1" cy="27.9" r="1" fill="#0B1220" opacity=".35" />
            <circle cx="35.1" cy="27.9" r="1" fill="#0B1220" opacity=".35" />
            <path d="M24.5 34.5q3.5 2.5 7 0" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" />
          </>
        )}

        {/* Base flutuante */}
        <ellipse cx="28" cy="49" rx="9" ry="3" className="fill-accent/45" />

        {cheering && (
          <g className="fill-warning animate-mascot-pulse">
            <path d="M6 14l1.1 2.9L10 18l-2.9 1.1L6 22l-1.1-2.9L2 18l2.9-1.1z" />
            <path d="M50 8l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" />
          </g>
        )}
      </g>
    </svg>
  );
}
