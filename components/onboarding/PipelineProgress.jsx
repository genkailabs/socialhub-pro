import Link from 'next/link';
import { Check, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    key: 'kit', label: 'Brand Kit', href: '/brand-kit', cta: 'Configurar Brand Kit',
    todo: 'Defina nicho, tom de voz e cores — é o que a IA usa para criar on-brand.'
  },
  {
    key: 'strategy', label: 'Estratégia', href: '/strategy', cta: 'Definir estratégia',
    todo: 'Aprove os pilares e objetivos da marca. É o norte que o Planejamento segue.'
  },
  {
    key: 'plan', label: 'Planejar semana', href: '/planning', cta: 'Planejar a semana',
    todo: 'Gere os temas da semana e aprove os que quiser produzir. Planejar é barato.'
  },
  {
    key: 'approve', label: 'Aprovar & agendar', href: '/calendar', cta: 'Agendar no Calendário',
    todo: 'Nada publica sozinho: aprove um rascunho e escolha a data/hora no Calendário.'
  },
  {
    key: 'publish', label: 'Publica', href: '/calendar', cta: 'Ver publicados',
    todo: 'No horário agendado, publicamos no Instagram automaticamente para você.'
  }
];

function detailFor(key, c) {
  switch (key) {
    case 'kit': return 'Marca configurada.';
    case 'strategy': return 'Estratégia aprovada.';
    case 'plan': return `${c.planItems} tema(s) planejado(s).`;
    case 'approve': return c.scheduled > 0 ? `${c.scheduled} post(s) agendado(s).` : 'Post enviado para publicação.';
    case 'publish': return `${c.published} post(s) publicado(s).`;
    default: return '';
  }
}

export function PipelineProgress({ pipeline }) {
  if (!pipeline) return null;
  const { done, currentIndex, counts } = pipeline;
  const allDone = currentIndex === -1;
  const next = allDone ? null : STEPS[currentIndex];

  return (
    <section className="bg-surface border border-line rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold text-ink tracking-tight">Fluxo do seu conteúdo</h2>
          </div>
          <p className="text-xs text-muted">Da estratégia à publicação: você conduz cada etapa e a IA ajuda no caminho.</p>
        </div>
        {allDone && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-success/15 border border-success/30 px-3 py-1.5 text-xs font-bold font-mono text-success">
            <Check className="h-3.5 w-3.5" /> Fluxo 100% completo
          </span>
        )}
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-5">
        {STEPS.map((s, i) => {
          const isDone = done[i];
          const isCurrent = i === currentIndex;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn(
                  'group flex h-full flex-col rounded-xl border p-3.5 transition-all duration-200',
                  isCurrent
                    ? 'border-accent/60 bg-accent/10 shadow-sm'
                    : isDone
                      ? 'border-line bg-surface-2/80 text-ink'
                      : 'border-line bg-surface-2/40 hover:border-accent/30'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-mono font-bold transition-colors',
                    isDone ? 'bg-success text-white' : isCurrent ? 'bg-accent text-white shadow-sm shadow-accent/40' : 'bg-surface text-muted'
                  )}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn('text-xs font-bold tracking-tight truncate', isCurrent ? 'text-accent' : isDone ? 'text-ink' : 'text-muted')}>
                    {s.label}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted font-normal">
                  {isDone ? detailFor(s.key, counts) : s.todo}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>

      {next ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface-2/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2.5 text-xs text-ink">
            <Info className="h-4 w-4 shrink-0 text-accent" />
            <span><strong className="font-bold text-accent">Próxima etapa recomendada:</strong> {next.todo}</span>
          </p>
          <Link
            href={next.href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-black transition-all hover:bg-accent-soft shadow-md shadow-accent/20"
          >
            {next.cta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-line bg-surface-2/60 p-3.5 text-xs text-muted flex items-center gap-2">
          <span>Tudo pronto: você planeja, aprova no Calendário e a publicação sai no horário agendado.</span>
        </p>
      )}
    </section>
  );
}
