import { TrendingUp, TrendingDown } from 'lucide-react';

export function FollowerTrend({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-xs text-muted">
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
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-ink tracking-tight">Seguidores · Evolução Diária</p>
          <p className="text-xs text-muted mt-0.5">Desempenho consolidado sincronizado via Graph API</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold font-mono ${
          up 
            ? 'bg-success/15 border-success/30 text-success' 
            : 'bg-danger/15 border-danger/30 text-danger'
        }`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? '+' : ''}{delta} esta semana
        </span>
      </div>

      <div className="flex h-52 items-end gap-3 pt-6 relative">
        {/* Linha horizontal de meta pontilhada */}
        <div className="absolute left-0 right-0 top-1/3 border-b border-dashed border-line flex items-center justify-end pr-2 pointer-events-none">
          <span className="text-[10px] font-mono text-faint bg-surface px-1 -mt-2">Média estabilizada</span>
        </div>

        {values.map((v, i) => {
          const h = max === min ? 40 : 15 + ((v - min) / (max - min)) * 80;
          const isLast = i === values.length - 1;
          return (
            <div key={i} className="group relative flex-1 h-full flex items-end">
              <div
                className={`w-full max-w-[42px] mx-auto rounded-t-lg transition-all duration-300 relative ${
                  isLast
                    ? 'bg-gradient-to-t from-accent/30 via-accent to-accent-soft shadow-lg shadow-accent/30'
                    : 'bg-gradient-to-t from-accent/15 to-accent/60 group-hover:from-accent/30 group-hover:to-accent'
                }`}
                style={{ height: `${h}%`, minHeight: 12 }}
              >
                {isLast && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-accent shadow-md shadow-accent" />
                )}
              </div>
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] font-bold text-ink shadow-xl opacity-0 transition-opacity group-hover:opacity-100 tabular-nums z-20">
                {v}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
