import { TrendingDown, TrendingUp } from 'lucide-react';

const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const W = 632;
const H = 142;

// Curva suave por bezier quadratica passando pelos pontos medios — sem
// depender de lib externa, so trigonometria simples.
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` Q${x0} ${y0} ${mx} ${(y0 + y1) / 2}`;
  }
  const last = points[points.length - 1];
  d += ` L${last[0]} ${last[1]}`;
  return d;
}

export function FollowerTrend({ data, platform = 'Instagram' }) {
  if (!data || data.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-xs text-muted">
        <p className="font-bold text-ink">Crescimento do perfil</p>
        <p className="mt-1">O grafico aparece conforme os dias passam, com um ponto por dia sincronizado com o {platform}.</p>
      </div>
    );
  }

  const values = data.map((item) => Number(item.followers) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min || 1;
  const delta = values[values.length - 1] - values[0];
  const up = delta >= 0;

  const pad = 10;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = pad + (H - pad * 2) * (1 - (v - min) / span);
    return [x, y];
  });
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L${W} ${H} L0 ${H} Z`;
  const lastPoint = points[points.length - 1];
  const lastDate = data[data.length - 1]?.snapshot_date ? new Date(data[data.length - 1].snapshot_date) : null;
  const mid = Math.round(min + span / 2);

  return (
    <div className="rounded-[24px] border border-line bg-surface p-6 shadow-soft">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-base font-bold tracking-tight text-ink">Crescimento do perfil</p>
          <p className="mt-0.5 text-xs text-muted">Novos seguidores · {platform}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs font-bold ${up ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {up ? '+' : ''}{delta} no periodo
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xl font-bold text-ink">{up ? '+' : ''}{delta}</span>
        <span className="text-xs text-muted">seguidores novos</span>
      </div>

      <div className="relative mt-4">
        {/* Guias horizontais + escala */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full flex-col justify-between py-[10px] text-right">
          {[max, mid, min].map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-mono text-[9px] text-muted">{v}</span>
              <span className="h-px flex-1 border-t border-dashed border-line" />
            </div>
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="relative h-36 w-full pl-10">
          <defs>
            <linearGradient id="followerArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#followerArea)" />
          <path d={linePath} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r="6" fill="rgb(var(--c-accent))" stroke="rgb(var(--c-surface))" strokeWidth="3" />
        </svg>

        {lastDate && (
          <div className="absolute -top-1 flex flex-col gap-0.5 rounded-xl bg-[#211E1B] px-2.5 py-1.5 shadow-lg" style={{ left: `calc(2.5rem + ${(lastPoint[0] / W) * 100}% - 45px)` }}>
            <span className="text-[8px] font-semibold text-white/60">{DOW[lastDate.getUTCDay()].toUpperCase()}, {lastDate.getUTCDate()}</span>
            <span className="text-[10px] font-bold text-white">{values[values.length - 1]} seguidores</span>
          </div>
        )}

        <div className="mt-2 flex justify-between pl-10 text-[10px] font-medium text-muted">
          {data.map((item, i) => {
            const d = item.snapshot_date ? new Date(item.snapshot_date) : null;
            const isLast = i === data.length - 1;
            return (
              <span key={item.snapshot_date || i} className={isLast ? 'font-bold text-accent' : ''}>
                {d ? DOW[d.getUTCDay()] : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
