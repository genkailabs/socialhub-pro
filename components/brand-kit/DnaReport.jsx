import React from 'react';
import { DnaScoreRing } from './DnaScoreRing';

const CAT_LABELS = {
  branding: 'Branding',
  copy: 'Copywriting',
  design: 'Design',
  growth: 'Crescimento',
  instagram: 'Instagram',
  competitor: 'Concorrência'
};

// Confiança vira ponto colorido + rótulo, como no handoff: média/alta em accent,
// baixa em faint. Nada de badge com fundo colorido.
const CONF = {
  alta: { dot: 'bg-accent', label: 'Confiança alta' },
  média: { dot: 'bg-accent', label: 'Confiança média' },
  media: { dot: 'bg-accent', label: 'Confiança média' },
  baixa: { dot: 'bg-faint', label: 'Confiança baixa' }
};

const INSIGHTS = [
  { key: 'strengths', title: 'Pontos Fortes', dot: 'bg-accent' },
  { key: 'weaknesses', title: 'Pontos de Melhoria', dot: 'bg-danger' },
  { key: 'opportunities', title: 'Recomendações', dot: 'bg-muted' }
];

function ScoreCard({ item }) {
  const score = Number(item.score || 0);
  const conf = CONF[item.confidence] || CONF.baixa;
  const filled = Math.round(score);

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 transition-transform duration-200 ease-emphasized hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {CAT_LABELS[item.key] || item.key}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} aria-hidden="true" />
          {conf.label}
        </span>
      </div>

      <p className="mt-3 flex items-baseline gap-0.5">
        <span className={`text-[30px] font-extrabold leading-none tabular-nums ${score >= 1 ? 'text-ink' : 'text-faint'}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-xs font-semibold text-faint">/10</span>
      </p>

      {/* Barra segmentada de 10 células — 5px de altura, raio 3, gap 3. */}
      <div className="mt-3 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={`h-[5px] flex-1 rounded-[3px] ${i < filled ? 'bg-accent' : 'bg-surface-3'}`} />
        ))}
      </div>

      {item.basis && <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{item.basis}</p>}
    </article>
  );
}

function InsightColumn({ title, dot, items }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {items.map((text, i) => (
          <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DnaReport({ report, updatedAt }) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        O diagnóstico da marca ainda não está disponível.
      </div>
    );
  }

  const { overall, categories = [], disclaimer } = report;
  const best = categories.reduce((max, c) => Math.max(max, Number(c.score || 0)), 0);
  const lastAnalysis = updatedAt
    ? new Date(updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '—';

  const resumo = [
    { value: String(categories.length), label: 'áreas avaliadas' },
    { value: best.toFixed(1), label: 'maior nota' },
    { value: lastAnalysis, label: 'última análise' }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-6">
          <DnaScoreRing value={overall} />
          <div className="min-w-[180px] flex-1">
            <h2 className="text-[15px] font-bold text-ink">Nota Geral</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Saúde geral da marca, calculada a partir das áreas avaliadas abaixo.
            </p>
          </div>
          <dl className="flex flex-wrap gap-7 border-line pl-0 sm:border-l sm:pl-6">
            {resumo.map((r) => (
              <div key={r.label}>
                <dt className="sr-only">{r.label}</dt>
                <dd className="text-[22px] font-extrabold leading-none tabular-nums text-ink">{r.value}</dd>
                <p className="mt-1 text-[11.5px] text-muted">{r.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => <ScoreCard key={c.key || i} item={c} />)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {INSIGHTS.map((g) => <InsightColumn key={g.key} title={g.title} dot={g.dot} items={report[g.key]} />)}
      </div>

      {disclaimer && <p className="text-[11.5px] text-faint">{disclaimer}</p>}
    </div>
  );
}
