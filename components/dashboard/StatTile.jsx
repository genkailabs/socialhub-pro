export function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
