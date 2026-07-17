import { TrendingDown, TrendingUp } from 'lucide-react';

export function FollowerTrend({ data, platform = 'Instagram' }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-xs text-muted">
        <p className="font-bold text-ink">Evolucao de seguidores</p>
        <p className="mt-1">O grafico aparece conforme os dias passam, com um ponto por dia sincronizado com o {platform}.</p>
      </div>
    );
  }

  const values = data.map((item) => Number(item.followers) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const delta = values[values.length - 1] - values[0];
  const up = delta >= 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-base font-bold tracking-tight text-ink">{platform} - Seguidores por dia</p>
          <p className="mt-0.5 text-xs text-muted">Historico mais recente sincronizado</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${up ? 'border-success/30 bg-success/15 text-success' : 'border-danger/30 bg-danger/15 text-danger'}`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? '+' : ''}{delta} no periodo
        </span>
      </div>

      <div className="relative flex h-52 items-end gap-3 pt-6">
        <div className="pointer-events-none absolute left-0 right-0 top-1/3 flex items-center justify-end border-b border-dashed border-line pr-2">
          <span className="-mt-2 bg-surface px-1 font-mono text-[10px] text-faint">Media do periodo</span>
        </div>
        {values.map((value, index) => {
          const height = max === min ? 40 : 15 + ((value - min) / (max - min)) * 80;
          const isLast = index === values.length - 1;
          return (
            <div key={data[index].snapshot_date || index} className="group relative flex h-full flex-1 items-end">
              <div className={`relative mx-auto w-full max-w-[42px] rounded-t-lg transition-all duration-300 ${isLast ? 'bg-accent shadow-sm shadow-accent/30' : 'bg-accent/45 group-hover:bg-accent/70'}`} style={{ height: `${height}%`, minHeight: 12 }}>
                {isLast && <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-white shadow-md shadow-accent" />}
              </div>
              <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] font-bold tabular-nums text-ink opacity-0 shadow-xl transition-opacity group-hover:opacity-100">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
