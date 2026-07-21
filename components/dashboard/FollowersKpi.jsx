import { TrendingUp, TrendingDown } from 'lucide-react';

// KPI hero "Seguidores": número grande + pílula de variação + sparkline.
// Sparkline usa o mesmo histórico real de seguidores do gráfico principal.
function sparkPath(values, w, h) {
  if (!values || values.length < 2) return { line: '', area: '' };
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 2 - (h - 4) * ((v - min) / span);
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  return { line, area };
}

export function FollowersKpi({ value, changeText, changeType = 'neutral', history = [] }) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';
  const values = history.map((h) => Number(h.followers) || 0);
  const { line, area } = sparkPath(values, 220, 56);

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">Seguidores</span>
        {changeText && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isPositive ? 'bg-success-tint text-success' : isNegative ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted'
            }`}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {changeText}
          </span>
        )}
      </div>

      <p className="mt-2 font-mono text-[40px] font-bold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </p>

      {line ? (
        <svg viewBox="0 0 220 56" preserveAspectRatio="none" className="mt-4 h-14 w-full">
          <defs>
            <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.16" />
              <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#sparkArea)" />
          <path d={line} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <p className="mt-4 text-[11px] text-muted">O gráfico aparece conforme os dias passam.</p>
      )}
    </div>
  );
}
