'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mascot } from './Mascot';

// Stepper do fluxo de conteúdo (redesign 2026-07): 5 nós circulares ligados por
// uma linha de progresso — com o mascote Hub caminhando até a etapa em foco e
// explicando o que fazer ali. Clicar num nó (ou usar ‹ ›) leva o mascote até a
// etapa para ler a explicação; a navegação de verdade sai pelo CTA do balão.
const STEPS = [
  {
    key: 'kit',
    label: 'Brand Kit',
    href: '/brand-kit',
    cta: 'Configurar Brand Kit',
    say: 'Começamos por aqui: me diga nicho, tom de voz e cores da marca. É esse Brand Kit que eu uso para criar tudo on-brand.',
    doneSay: () => 'Brand Kit pronto — já sei falar como a sua marca.'
  },
  {
    key: 'strategy',
    label: 'Estratégia',
    href: '/strategy',
    cta: 'Definir estratégia',
    say: 'Agora os pilares e o objetivo da marca. É o norte que eu sigo quando for planejar a sua semana.',
    doneSay: () => 'Estratégia aprovada — tenho o norte do conteúdo.'
  },
  {
    key: 'plan',
    label: 'Planejar semana',
    href: '/planning',
    cta: 'Planejar a semana',
    say: 'Eu gero os temas da semana e você aprova os que quiser produzir. Planejar é barato; publicar errado é caro.',
    doneSay: (c) => `${c.planItems} tema(s) planejado(s) para a sua semana.`
  },
  {
    key: 'approve',
    label: 'Aprovar & agendar',
    href: '/calendar',
    cta: 'Agendar no Calendário',
    say: 'Nada publica sozinho: você aprova o rascunho e escolhe a data e a hora no Calendário.',
    doneSay: (c) => (c.scheduled > 0 ? `${c.scheduled} post(s) agendado(s) esperando a hora.` : 'Post enviado para publicação.')
  },
  {
    key: 'publish',
    label: 'Publicar',
    href: '/calendar',
    cta: 'Ver publicados',
    say: 'No horário marcado eu publico no Instagram por você. Depois é só acompanhar o resultado aqui no Dashboard.',
    doneSay: (c) => `${c.published} post(s) publicado(s). Chegamos ao fim do fluxo — agora é repetir.`
  }
];

// Centro de cada nó dentro da grade de 5 colunas.
const posOf = (i) => `${(i + 0.5) * 20}%`;

export function FlowStepper({ pipeline }) {
  const allDone = pipeline ? pipeline.currentIndex === -1 : false;
  const homeIndex = pipeline ? (allDone ? STEPS.length - 1 : pipeline.currentIndex) : 0;
  const [focus, setFocus] = useState(homeIndex);

  if (!pipeline) return null;
  const { done, currentIndex, counts } = pipeline;

  // Progresso preenchido: até o nó atual (ou 100% se completo).
  const filledIndex = allDone ? STEPS.length - 1 : currentIndex;
  const progressPct = (filledIndex / (STEPS.length - 1)) * 100;

  const step = STEPS[focus];
  const focusDone = done[focus];
  const status = focusDone ? 'Concluída' : focus === currentIndex ? 'Você está aqui' : 'A seguir';

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-soft">
      <div className="relative">
        {/* Trilho + progresso, centralizado na linha dos nós (h-8 → centro 16px) */}
        <div className="pointer-events-none absolute left-0 right-0 top-4 mx-[10%] h-0.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="pointer-events-none absolute left-0 top-4 mx-[10%] h-0.5 -translate-y-1/2 rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `calc(80% * ${progressPct / 100})` }}
        />

        <ol className="relative grid grid-cols-5">
          {STEPS.map((s, i) => {
            const isDone = done[i];
            const isCurrent = i === currentIndex;
            const isFocus = i === focus;
            return (
              <li key={s.key} className="flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setFocus(i)}
                  aria-pressed={isFocus}
                  aria-label={`Etapa ${i + 1}: ${s.label}`}
                  className="group flex flex-col items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full border-2 font-mono text-xs font-bold transition-colors',
                      isDone
                        ? 'border-success bg-success text-white'
                        : isCurrent
                          ? 'border-accent bg-accent text-white'
                          : 'border-line bg-surface text-muted group-hover:border-accent/40',
                      isFocus && !isDone && !isCurrent && 'border-accent/60 text-accent'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-semibold leading-tight sm:text-xs',
                      isFocus ? 'text-accent' : isDone ? 'text-ink' : 'text-muted'
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Faixa do mascote: ele caminha até a etapa em foco. */}
      <div className="relative mt-3 h-[62px]">
        <div
          className="absolute top-0 w-12 -translate-x-1/2 transition-[left] duration-700 ease-emphasized motion-reduce:transition-none"
          style={{ left: posOf(focus) }}
        >
          <Mascot mood={focusDone ? 'cheer' : 'guide'} className="h-[62px] w-12" />
        </div>
      </div>

      {/* Balão do mascote */}
      <div className="relative rounded-2xl border border-line bg-surface-2 p-4">
        <span
          className="absolute -top-[6px] h-3 w-3 -translate-x-1/2 rotate-45 rounded-[3px] border-l border-t border-line bg-surface-2 transition-[left] duration-700 ease-emphasized motion-reduce:transition-none"
          style={{ left: posOf(focus) }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-muted">Etapa {focus + 1} de {STEPS.length}</span>
          <span className="text-[13px] font-semibold text-ink">{step.label}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              focusDone
                ? 'bg-success/15 text-success'
                : focus === currentIndex
                  ? 'bg-accent/15 text-accent'
                  : 'bg-surface-3 text-muted'
            )}
          >
            {status}
          </span>
        </div>

        <p aria-live="polite" className="mt-2 text-[13px] leading-relaxed text-ink-2">
          {focusDone ? step.doneSay(counts) : step.say}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={step.href}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-ink"
          >
            {step.cta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {focus !== homeIndex && (
            <button
              type="button"
              onClick={() => setFocus(homeIndex)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-ink-2 transition-colors hover:border-accent/40 hover:text-accent"
            >
              <Undo2 className="h-3.5 w-3.5" /> Voltar para onde parei
            </button>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFocus((f) => Math.max(0, f - 1))}
              disabled={focus === 0}
              aria-label="Etapa anterior"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-2 transition-colors hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setFocus((f) => Math.min(STEPS.length - 1, f + 1))}
              disabled={focus === STEPS.length - 1}
              aria-label="Próxima etapa"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-2 transition-colors hover:border-accent/40 hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
