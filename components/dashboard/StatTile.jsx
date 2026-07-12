export function StatTile({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-4 shadow-soft transition-all duration-300 ease-emphasized hover:-translate-y-0.5 hover:shadow-lift ${
      accent ? 'border-accent/30 bg-accent-tint' : 'border-line bg-surface'
    }`}>
      {accent && (
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/10 blur-xl" />
      )}
      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
        {Icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent ? 'bg-accent text-white' : 'bg-surface-2 text-muted'}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`relative mt-2 text-[26px] font-extrabold leading-none tracking-tight ${accent ? 'text-accent-ink' : 'text-ink'}`}>{value}</p>
      {hint && <p className="relative mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
