import { BarChart3, CheckCircle2, ListChecks } from 'lucide-react';
import { formatLabel } from '@/lib/content-production';

const STATE_LABELS = {
  idea: 'Ideias',
  approved: 'Aprovados',
  in_production: 'Em produção',
  ready: 'Prontos',
  rejected: 'Removidos'
};

const DETAIL_FALLBACK = 'Não informado';

export function itemDetails(item = {}) {
  return {
    objective: item.objective || DETAIL_FALLBACK,
    summary: item.summary || DETAIL_FALLBACK,
    hook: item.hook || DETAIL_FALLBACK,
    cta: item.cta || DETAIL_FALLBACK,
    audience: item.target_audience || DETAIL_FALLBACK,
    duration: item.estimated_duration || DETAIL_FALLBACK,
    suggestedTime: item.suggested_time || DETAIL_FALLBACK
  };
}

export function availablePlanningItemActions(item = {}) {
  if (item.status === 'idea') return ['edit', 'replace', 'remove', 'approve'];
  if (item.status === 'approved') return ['edit', 'produce'];
  if (item.status === 'ready' && item.post_id) return ['viewContent'];
  return [];
}

export function summarizePlanning(items = []) {
  const states = Object.fromEntries(Object.keys(STATE_LABELS).map((state) => [state, 0]));
  const formats = {};
  const objectives = {};

  for (const item of items) {
    if (states[item.status] !== undefined) states[item.status] += 1;
    const format = item.format || 'Sem formato';
    const objective = item.objective || 'Sem objetivo';
    formats[format] = (formats[format] || 0) + 1;
    objectives[objective] = (objectives[objective] || 0) + 1;
  }

  const total = items.length;
  return {
    total,
    ready: states.ready,
    progress: total ? Math.round((states.ready / total) * 100) : 0,
    states,
    formats,
    objectives
  };
}

export function progressBarProps(summary) {
  return {
    role: 'progressbar',
    'aria-label': 'Conteúdos prontos para publicar',
    'aria-valuemin': 0,
    'aria-valuemax': summary.total,
    'aria-valuenow': summary.ready
  };
}

function Distribution({ entries, format = (value) => value }) {
  if (!entries.length) return <p className="text-xs text-muted">Ainda não há dados.</p>;
  return (
    <ul className="space-y-2">
      {entries.map(([label, count]) => (
        <li key={label} className="flex items-center justify-between gap-3 text-xs">
          <span className="truncate text-muted">{format(label)}</span>
          <span className="font-mono font-bold text-ink">{count}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlanningSummary({ items, weeklySummary }) {
  const summary = summarizePlanning(items);
  const progressProps = progressBarProps(summary);
  const strategicSummary = typeof weeklySummary === 'string'
    ? weeklySummary
    : [weeklySummary?.mainFocus, weeklySummary?.description].filter(Boolean).join(' — ');
  const stateEntries = Object.entries(summary.states).filter(([, count]) => count > 0);
  const formatEntries = Object.entries(summary.formats).sort((a, b) => b[1] - a[1]);
  const objectiveEntries = Object.entries(summary.objectives).sort((a, b) => b[1] - a[1]);

  return (
    <section aria-label="Resumo do planejamento" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-bold text-ink"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />Progresso</div>
        <p className="mt-3 text-2xl font-extrabold text-ink">{summary.ready}<span className="text-sm font-semibold text-muted">/{summary.total}</span></p>
        <div {...progressProps} className="mt-3 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-success" style={{ width: `${summary.progress}%` }} /></div>
        <p className="mt-2 text-xs text-muted">{summary.progress}% prontos para publicar</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-bold text-ink"><ListChecks className="h-4 w-4 text-accent" aria-hidden="true" />Estado da semana</div>
        <div className="mt-3"><Distribution entries={stateEntries} format={(state) => STATE_LABELS[state]} /></div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-bold text-ink"><BarChart3 className="h-4 w-4 text-accent" aria-hidden="true" />Formatos</div>
        <div className="mt-3"><Distribution entries={formatEntries} format={formatLabel} /></div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <p className="text-xs font-bold text-ink">Resumo estratégico</p>
        {strategicSummary && <p className="mt-2 text-xs leading-relaxed text-muted">{strategicSummary}</p>}
        <div className="mt-3"><Distribution entries={objectiveEntries} /></div>
      </div>
    </section>
  );
}
