function number(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value);
}

export function formatPaidMetric(value, kind, currency) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  if (kind === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL', maximumFractionDigits: 2 }).format(value);
  if (kind === 'percent') return `${number(value, 2)}%`;
  return number(value, kind === 'decimal' ? 2 : 0);
}

const ITEMS = [
  ['Investimento', 'spend', 'currency'], ['Alcance', 'reach', 'number'], ['Impressões', 'impressions', 'number'],
  ['Cliques no link', 'linkClicks', 'number'], ['CTR', 'ctr', 'percent'], ['CPC', 'cpc', 'currency']
];

export function PaidTrafficKpis({ summary, currency, rangeLabel, syncedAt }) {
  return <section aria-label="Indicadores de tráfego pago" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>Dados de anúncios Meta · {rangeLabel}</span>
      <span>{syncedAt ? `Sincronizado em ${new Date(syncedAt).toLocaleString('pt-BR')}` : 'Aguardando primeira sincronização'}</span>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {ITEMS.map(([label, key, kind]) => <div key={key} className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-faint">{label}</p>
        <p className="mt-2 font-mono text-xl font-bold text-ink">{formatPaidMetric(summary?.[key], kind, currency)}</p>
      </div>)}
    </div>
  </section>;
}
