import Link from 'next/link';
import { Check, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivatePilotButton } from './ActivatePilotButton';

// Meta de apresentação dos 5 passos do fluxo (o estado vem de lib/pipeline.js).
const STEPS = [
  {
    key: 'kit', label: 'Brand Kit', href: '/brand-kit', cta: 'Configurar Brand Kit',
    todo: 'Defina nicho, tom de voz e cores — é o que a IA usa para criar on-brand.'
  },
  {
    key: 'pilot', label: 'Ativar Piloto', href: '/autopilot', cta: 'Ativar Piloto Automático',
    todo: 'Ligue o Piloto para a IA gerar posts todos os dias. Sem isso, nada é gerado.'
  },
  {
    key: 'generate', label: 'IA gera rascunho', href: '/approvals', cta: 'Ver rascunhos',
    todo: 'A IA cria os criativos do dia sozinha (roda 09:00, na nuvem) como rascunho.'
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
    case 'pilot': return 'Piloto ativo — gerando todo dia.';
    case 'generate': return c.waiting > 0 ? `${c.waiting} rascunho(s) aguardando você.` : 'Rascunhos sendo gerados.';
    case 'approve': return c.scheduled > 0 ? `${c.scheduled} post(s) agendado(s).` : 'Post enviado para publicação.';
    case 'publish': return `${c.published} post(s) publicado(s).`;
    default: return '';
  }
}

export function PipelineProgress({ pipeline }) {
  if (!pipeline) return null;
  const { brandId, done, currentIndex, counts } = pipeline;
  const allDone = currentIndex === -1;
  const next = allDone ? null : STEPS[currentIndex];

  return (
    <section className="glass rounded-3xl p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold tracking-tight text-ink">Seu fluxo de publicação</h2>
          <p className="mt-0.5 text-xs text-muted">A IA cria, você aprova, nós publicamos — acompanhe em que etapa você está.</p>
        </div>
        {allDone && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
            <Check className="h-3.5 w-3.5" /> Fluxo completo
          </span>
        )}
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
        {STEPS.map((s, i) => {
          const isDone = done[i];
          const isCurrent = i === currentIndex;
          return (
            <li key={s.key}>
              <Link
                href={s.href}
                className={cn(
                  'group flex h-full flex-col rounded-2xl border p-3 transition-all',
                  isCurrent
                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                    : isDone
                      ? 'border-success/30 bg-success/5'
                      : 'border-line bg-surface-2/50 hover:border-line-strong'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold',
                    isDone ? 'bg-success text-white' : isCurrent ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
                  )}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn('text-xs font-bold', isCurrent ? 'text-accent' : isDone ? 'text-ink' : 'text-muted')}>
                    {s.label}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-muted">
                  {isDone ? detailFor(s.key, counts) : s.todo}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>

      {next ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 dark:bg-accent/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs text-ink">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span><strong className="font-extrabold">Próximo passo:</strong> {next.todo}</span>
          </p>
          {next.key === 'pilot' ? (
            <ActivatePilotButton brandId={brandId} label={next.cta} />
          ) : (
            <Link
              href={next.href}
              className="glow-accent inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white transition-transform active:scale-[0.98]"
            >
              {next.cta} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-success/25 bg-success/5 p-3 text-xs text-muted">
          Tudo pronto: o Piloto gera, você aprova no Calendário e a publicação sai no horário agendado. 🎉
        </p>
      )}
    </section>
  );
}
