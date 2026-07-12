import { Inbox } from 'lucide-react';

export function EmptyState({ title, children, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-tint text-accent">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
