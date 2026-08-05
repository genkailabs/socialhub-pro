import Link from 'next/link';
import { ArrowUpRight, Sparkles, Contrast, Recycle } from 'lucide-react';
import { tiposPorObjetivo } from '@/lib/carrossel-tipos';

// Um ícone por objetivo. Descoberta puxa para fora (seta), relacionamento
// aproxima (brilho), venda contrasta a oferta.
const ICONS = { descoberta: ArrowUpRight, relacionamento: Sparkles, venda: Contrast };

/**
 * "O que você quer criar?" — atalhos por intenção, não por formato.
 *
 * Cada card é o carro-chefe de um objetivo real (lib/carrossel-tipos.js), e o
 * link já abre o Studio no tipo escolhido. Escolher "Descoberta" e cair numa
 * tela genérica seria o mesmo que não ter atalho.
 *
 * O quarto card, "Reciclar conteúdo", leva ao histórico: reaproveitar o que já
 * performou é a coisa mais barata que existe, e ela não vive no Composer.
 */
export function CreationShortcuts() {
  const grupos = tiposPorObjetivo();

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {grupos.map((grupo) => {
        const tipo = grupo.tipos[0];
        if (!tipo) return null;
        const Icon = ICONS[grupo.objetivo] || Sparkles;
        return (
          <Link
            key={grupo.objetivo}
            href={`/composer?format=carrossel&tipo=${tipo.id}`}
            className="group rounded-2xl border border-line bg-surface-2 p-3.5 transition-colors hover:border-accent/50"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/15 text-accent-ink">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[13px] font-bold leading-tight text-ink">{tipo.label}</p>
            <p className="mt-1 text-[11px] leading-[15px] text-muted">{grupo.resumo}</p>
          </Link>
        );
      })}

      <Link
        href="/calendar"
        className="group rounded-2xl border border-line bg-surface-2 p-3.5 transition-colors hover:border-accent/50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan/12 text-cyan-ink">
          <Recycle className="h-4 w-4" />
        </span>
        <p className="mt-3 text-[13px] font-bold leading-tight text-ink">Reciclar conteúdo</p>
        <p className="mt-1 text-[11px] leading-[15px] text-muted">Dar nova vida a um post publicado.</p>
      </Link>
    </div>
  );
}
