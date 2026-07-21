import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Stepper fino do fluxo de conteúdo (redesign 2026-07): 5 nós circulares
// ligados por uma linha de progresso, labels abaixo. Substitui as 5 caixas
// iguais do PipelineProgress — mesmo dado (`pipeline`), menos peso visual.
const STEPS = [
  { key: 'kit', label: 'Brand Kit', href: '/brand-kit' },
  { key: 'strategy', label: 'Estratégia', href: '/strategy' },
  { key: 'plan', label: 'Planejar semana', href: '/planning' },
  { key: 'approve', label: 'Aprovar & agendar', href: '/calendar' },
  { key: 'publish', label: 'Publicar', href: '/calendar' }
];

const NEXT_HINT = {
  kit: { text: 'defina nicho, tom de voz e cores no Brand Kit — é o que a IA usa para criar on-brand.', cta: 'Configurar Brand Kit' },
  strategy: { text: 'aprove os pilares e objetivos da marca em Estratégia.', cta: 'Definir estratégia' },
  plan: { text: 'gere os temas da semana em Planejamento e aprove os que quiser produzir.', cta: 'Planejar agora' },
  approve: { text: 'aprove um rascunho e escolha a data/hora no Calendário.', cta: 'Agendar no Calendário' },
  publish: { text: 'no horário agendado, publicamos no Instagram automaticamente para você.', cta: 'Ver publicados' }
};

export function FlowStepper({ pipeline }) {
  if (!pipeline) return null;
  const { done, currentIndex } = pipeline;
  const allDone = currentIndex === -1;
  const next = allDone ? null : STEPS[currentIndex];
  const nextHint = next ? NEXT_HINT[next.key] : null;

  // Progresso preenchido: até o nó atual (ou 100% se completo).
  const filledIndex = allDone ? STEPS.length - 1 : currentIndex;
  const progressPct = (filledIndex / (STEPS.length - 1)) * 100;

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
            return (
              <li key={s.key} className="flex flex-col items-center gap-2 text-center">
                <Link href={s.href} className="group flex flex-col items-center gap-2">
                  <span
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full border-2 font-mono text-xs font-bold transition-colors',
                      isDone
                        ? 'border-success bg-success text-white'
                        : isCurrent
                          ? 'border-accent bg-accent text-white'
                          : 'border-line bg-surface text-muted group-hover:border-accent/40'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-semibold leading-tight sm:text-xs',
                      isCurrent ? 'text-accent' : isDone ? 'text-ink' : 'text-muted'
                    )}
                  >
                    {s.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {next ? (
        <p className="mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-relaxed text-ink-2">
          <span className="font-semibold text-accent">Próxima etapa:</span>
          <span>{nextHint.text}</span>
          <Link href={next.href} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
            {nextHint.cta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-[13px] text-muted">
          Tudo pronto: você planeja, aprova no Calendário e a publicação sai no horário agendado.
        </p>
      )}
    </section>
  );
}
