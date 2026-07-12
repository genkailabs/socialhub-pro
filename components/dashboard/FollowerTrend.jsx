import { TrendingUp, TrendingDown } from 'lucide-react';

export function FollowerTrend({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-5 text-xs text-muted">
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
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Seguidores · evolução</p>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-success' : 'text-danger'}`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? '+' : ''}{delta}
        </span>
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {values.map((v, i) => {
          const h = max === min ? 60 : 12 + ((v - min) / (max - min)) * 88;
          return (
            <div key={i} className="group relative flex-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-accent/50 to-accent transition-all duration-300 ease-emphasized group-hover:from-accent group-hover:to-accent-soft"
                style={{ height: `${h}%`, minHeight: 6 }}
              />
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-app opacity-0 transition-opacity group-hover:opacity-100">
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
