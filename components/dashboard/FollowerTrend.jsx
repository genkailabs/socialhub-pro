import { TrendingUp, TrendingDown } from 'lucide-react';

export function FollowerTrend({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-line/80 dark:border-line/40 bg-surface/60 p-6 text-xs text-muted">
        <p className="font-bold text-ink">Evolução de seguidores</p>
        <p className="mt-1">O gráfico aparece conforme os dias passam — um ponto por dia sincronizado com o Instagram.</p>
      </div>
    );
  }
  const values = data.map((d) => Number(d.followers) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const up = delta >= 0;

  return (
    <div className="rounded-2xl border border-line/80 dark:border-line/40 bg-surface p-6 shadow-soft">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Seguidores · evolução</p>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-success' : 'text-danger'}`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? '+' : ''}{delta}
        </span>
      </div>
      <div className="flex h-32 items-end gap-2 pt-4">
        {values.map((v, i) => {
          const h = max === min ? 60 : 12 + ((v - min) / (max - min)) * 88;
          return (
            <div key={i} className="group relative flex-1 h-full flex items-end">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-accent/25 to-accent transition-all duration-300 ease-emphasized group-hover:from-accent group-hover:to-accent-soft"
                style={{ height: `${h}%`, minHeight: 6 }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 font-mono text-[11px] font-bold text-ink shadow-soft opacity-0 transition-opacity group-hover:opacity-100 tabular-nums z-10">
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

