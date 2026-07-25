'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot } from './Mascot';

/*
 * O mascote Hub explicando uma tela.
 *
 * `variant="inline"` — cartão abaixo do título da página (padrão).
 * `variant="floating"` — bolha fixa no canto, para telas sem cabeçalho (Composer).
 *
 * A preferência de aberto/fechado fica no localStorage por `id`: quem já
 * entendeu a tela fecha e ela não volta a atrapalhar; o botão do mascote
 * continua ali para reabrir.
 */
export function MascotTip({ id, title, lines = [], cta, variant = 'inline', mood = 'guide' }) {
  const defaultOpen = variant === 'inline';
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(`hub-tip:${id}`);
    } catch {
      // localStorage bloqueado (modo privado): mantém o padrão da variante.
    }
    if (stored) setOpen(stored === 'open');
    setHydrated(true);
  }, [id]);

  function toggle(next) {
    setOpen(next);
    try {
      localStorage.setItem(`hub-tip:${id}`, next ? 'open' : 'closed');
    } catch {
      // sem persistência: a escolha vale só nesta navegação.
    }
  }

  // Antes de ler o localStorage a bolha flutuante não aparece, para não
  // piscar na tela de quem já fechou.
  if (variant === 'floating' && !hydrated) return null;

  const card = (
    <div className="relative flex gap-3 rounded-2xl border border-line bg-surface-2 p-4 pr-10">
      <Mascot mood={mood} className="h-[54px] w-11 shrink-0 self-start" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {lines.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {lines.map((line) => (
              <li key={line} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
        {cta && (
          <Link
            href={cta.href}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-ink"
          >
            {cta.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => toggle(false)}
        aria-label="Fechar explicação do Hub"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const reopen = (
    <button
      type="button"
      onClick={() => toggle(true)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-accent/40 hover:text-accent',
        variant === 'floating' && 'shadow-lift'
      )}
    >
      <Mascot mood={mood} className="h-8 w-7 shrink-0" />
      O Hub explica esta tela
    </button>
  );

  if (variant === 'floating') {
    return (
      <div className="fixed bottom-5 right-5 z-40 max-w-[min(360px,calc(100vw-2.5rem))]">
        {open ? <div className="shadow-lift">{card}</div> : reopen}
      </div>
    );
  }

  return open ? card : reopen;
}
