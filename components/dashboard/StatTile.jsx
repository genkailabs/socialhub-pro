import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatTile({ label, value, hint, icon: Icon, accent, change, changeType = 'positive' }) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className={`group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 ease-emphasized shadow-lg shadow-black/40 ${
      accent 
        ? 'bg-surface border-accent/50 glow-accent' 
        : 'bg-surface border-line hover:border-accent/50'
    }`}>
      {/* Gradiente sutil em hover (Ambient Glow do Sales-Ops) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted tracking-normal">
          {label}
        </span>
        {Icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-lg transition-colors duration-300 ${
            accent 
              ? 'bg-accent text-white shadow-md shadow-accent/25' 
              : 'bg-surface-2 text-muted group-hover:bg-accent/15 group-hover:text-accent'
          }`}>
            <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          </span>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-3">
        <div>
          <p className={`font-mono text-3xl font-bold leading-none tracking-tight tabular-nums ${
            accent ? 'text-accent' : 'text-ink'
          }`}>
            {value}
          </p>
          {hint && <p className="mt-1.5 font-mono text-[11px] text-muted">{hint}</p>}
        </div>

        {change && (
          <div className={`flex items-center gap-1 text-xs font-semibold mb-0.5 ${
            isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-muted'
          }`}>
            {isPositive && <TrendingUp className="h-3.5 w-3.5 shrink-0" />}
            {isNegative && <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
}
