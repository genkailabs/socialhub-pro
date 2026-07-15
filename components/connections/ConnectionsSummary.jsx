import { Radio } from 'lucide-react';

export function ConnectionsSummary({ brandName, connected, available, soon }) {
  const total = connected + available + soon;
  const pct = total ? Math.round((connected / total) * 100) : 0;

  const stats = [
    { label: 'Conectadas', value: connected, dot: 'bg-success' },
    { label: 'Disponíveis', value: available, dot: 'bg-accent' },
    { label: 'Em breve', value: soon, dot: 'bg-faint' }
  ];

  return (
    <div className="animate-rise overflow-hidden rounded-2xl glass shadow-soft">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted">
            <Radio className="h-4 w-4 text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Saúde das conexões</span>
          </div>
          <p className="mt-1.5 text-2xl font-extrabold text-ink">
            {connected}<span className="text-muted">/{total}</span>{' '}
            <span className="text-sm font-bold text-muted">redes ativas</span>
          </p>
          {brandName && (
            <p className="mt-0.5 truncate text-xs text-muted">
              Marca <strong className="text-ink">{brandName}</strong> · publique e colete métricas reais
            </p>
          )}
        </div>

        <div className="flex items-center gap-5">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-extrabold text-ink">{s.value}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-1.5 w-full bg-line">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-700 ease-emphasized"
          style={{ width: `${Math.max(pct, connected ? 6 : 0)}%` }}
        />
      </div>
    </div>
  );
}
