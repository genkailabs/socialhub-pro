import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatTile({ label, value, hint, icon: Icon, change, changeType = 'positive' }) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className="relative rounded-[20px] border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        {Icon && <Icon className="h-[18px] w-[18px] text-accent" strokeWidth={2} />}
      </div>

      <p className="mt-2 font-mono text-[25px] font-bold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </p>
      {hint && <p className="mt-1.5 font-mono text-[11px] text-muted">{hint}</p>}

      {change && (
        <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold ${
          isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-muted'
        }`}>
          {isPositive && <TrendingUp className="h-3 w-3 shrink-0" />}
          {isNegative && <TrendingDown className="h-3 w-3 shrink-0" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}
