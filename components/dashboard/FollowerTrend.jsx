export function FollowerTrend({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface p-4 text-[11px] text-muted">
        O gráfico de evolução de seguidores aparece conforme os dias passam (um ponto por dia sincronizado).
      </div>
    );
  }
  const values = data.map((d) => Number(d.followers) || 0);
  const max = Math.max(...values, 1);
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Seguidores · evolução</p>
        <span className={`text-[11px] font-bold ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
          {delta >= 0 ? '+' : ''}{delta}
        </span>
      </div>
      <div className="flex h-24 items-end gap-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex-1 rounded-t bg-accent/70 transition-all"
            style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
            title={`${data[i].snapshot_date}: ${v}`} />
        ))}
      </div>
    </div>
  );
}
