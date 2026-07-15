export function StatTile({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className={`glass group relative overflow-hidden rounded-3xl p-5 transition-all duration-300 ease-emphasized hover:-translate-y-1 ${
      accent ? 'glow-accent' : 'shadow-soft hover:shadow-lift'
    }`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
        {Icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? 'bg-accent text-white shadow-md shadow-accent/25' : 'bg-surface-2/80 text-accent'}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className={`relative mt-3 font-mono text-[32px] font-bold leading-none tracking-tight tabular-nums ${accent ? 'text-accent dark:text-accent-soft' : 'text-ink'}`}>{value}</p>
      {hint && <p className="relative mt-1.5 font-mono text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
