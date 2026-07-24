import React from 'react';

// Anel de progresso do handoff Apple: 104px, raio 45, traço 9, arco girado -90°
// para começar no topo. Compartilhado entre Brand Kit e Diagnóstico do Instagram.
const CIRC = 2 * Math.PI * 45; // 282.74

export function DnaScoreRing({ value, max = 10, tone = 'accent', label, caption }) {
  const pct = Math.max(0, Math.min(1, Number(value || 0) / max));
  const stroke = tone === 'warning' ? 'rgb(var(--c-warning))' : 'rgb(var(--c-accent))';

  return (
    <div className="relative grid h-[104px] w-[104px] shrink-0 place-items-center">
      <svg viewBox="0 0 104 104" className="h-[104px] w-[104px] -rotate-90" aria-hidden="true">
        <circle cx="52" cy="52" r="45" fill="none" stroke="rgb(var(--c-surface-3))" strokeWidth="9" />
        <circle
          cx="52"
          cy="52"
          r="45"
          fill="none"
          stroke={stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(pct * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="text-[28px] font-extrabold leading-none tabular-nums text-ink">
          {label ?? Number(value || 0).toFixed(1)}
        </span>
        {caption && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">{caption}</span>}
      </div>
    </div>
  );
}
