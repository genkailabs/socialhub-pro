export function StatTile({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
        {Icon && (
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${accent ? 'bg-accent/10 text-accent' : 'bg-app text-muted'}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
