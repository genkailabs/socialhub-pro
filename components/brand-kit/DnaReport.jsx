import { TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

const CAT_LABELS = {
  branding: 'Branding',
  instagram: 'Instagram',
  copy: 'Copywriting',
  design: 'Design',
  growth: 'Crescimento',
  competitor: 'Concorrência'
};

const CONF = {
  alta: 'bg-success/15 text-success',
  média: 'bg-amber-500/15 text-amber-500',
  baixa: 'bg-line text-muted'
};

function List({ icon: Icon, title, items, tone }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl glass p-4">
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${tone}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="text-sm text-ink">{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function DnaReport({ report }) {
  if (!report) return null;
  const { overall, categories = [], strengths, weaknesses, opportunities, disclaimer } = report;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl glass p-5">
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-accent/10">
          <span className="text-2xl font-extrabold text-accent">{Number(overall).toFixed(1)}</span>
          <span className="text-[10px] font-semibold uppercase text-faint">/ 10</span>
        </div>
        <div>
          <p className="text-sm font-bold text-ink">Nota geral do Brand DNA</p>
          <p className="text-xs text-muted">Síntese qualitativa das lentes analisadas.</p>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((c, i) => (
            <div key={i} className="rounded-xl glass p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink">{CAT_LABELS[c.key] || c.key}</span>
                <span className="text-sm font-extrabold text-accent">{Number(c.score).toFixed(1)}<span className="text-[10px] text-faint">/10</span></span>
              </div>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CONF[c.confidence] || CONF.baixa}`}>
                confiança {c.confidence || 'baixa'}
              </span>
              {c.basis && <p className="mt-2 text-xs text-muted">{c.basis}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <List icon={TrendingUp} title="Forças" items={strengths} tone="text-success" />
        <List icon={AlertTriangle} title="Fraquezas" items={weaknesses} tone="text-danger" />
        <List icon={Lightbulb} title="Oportunidades" items={opportunities} tone="text-accent" />
      </div>

      {disclaimer && <p className="text-xs text-faint">{disclaimer}</p>}
    </div>
  );
}
