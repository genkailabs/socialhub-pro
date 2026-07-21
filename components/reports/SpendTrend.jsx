import { formatUsd } from '@/lib/ai/cost';

// Gráfico de linha "Gasto diário" (redesign) — série real vinda do agregado
// de generation_jobs, bucketizada por dia em ai-costs-data.js.
const W = 640;
const H = 160;
const PAD = 12;

export function SpendTrend({ daily = [] }) {
  if (!daily || daily.length < 2) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface/60 p-6 text-xs text-muted">
        <p className="text-sm font-bold text-ink">Gasto diário</p>
        <p className="mt-1">O gráfico aparece quando houver consumo registrado em pelo menos dois dias.</p>
      </div>
    );
  }

  const values = daily.map((d) => Number(d.usd) || 0);
  const max = Math.max(...values, 0.000001);
  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + (H - PAD * 2) * (1 - v / max);
    return [x, y];
  });
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${H - PAD} L${points[0][0].toFixed(1)} ${H - PAD} Z`;
  const totalPeriodo = values.reduce((a, b) => a + b, 0);
  const fmtDay = (iso) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-base font-bold tracking-tight text-ink">Gasto diário</p>
          <p className="mt-0.5 text-xs text-muted">Consumo de IA por dia · {daily.length} dias</p>
        </div>
        <span className="font-mono text-sm font-bold tabular-nums text-ink">{formatUsd(totalPeriodo)}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full">
        <defs>
          <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.16" />
            <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spendArea)" />
        <path d={line} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="rgb(var(--c-accent))" />
        ))}
      </svg>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>{fmtDay(daily[0].date)}</span>
        <span>{fmtDay(daily[daily.length - 1].date)}</span>
      </div>
    </div>
  );
}
