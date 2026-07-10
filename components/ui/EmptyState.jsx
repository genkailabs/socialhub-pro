export function EmptyState({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center">
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">{children}</p>
    </div>
  );
}
