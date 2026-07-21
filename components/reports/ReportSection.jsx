export function ReportSection({ id, title, description, active, children }) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-[22px] border bg-surface p-5 ${active ? 'border-accent ring-1 ring-accent/30' : 'border-line'}`}>
      <div className="flex items-start gap-3">
        <div><h2 className="text-base font-bold tracking-tight text-ink">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div>
        {active && <span className="ml-auto rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold text-accent">Metrica do insight</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MissingMetric({ children = 'Ainda nao ha dados suficientes para esta metrica.' }) {
  return <p className="rounded-xl border border-dashed border-line bg-surface-2 px-4 py-4 text-xs leading-relaxed text-muted">{children}</p>;
}
