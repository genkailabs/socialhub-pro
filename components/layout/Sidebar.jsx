'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-surface p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-accent to-accent-soft" />
        <span className="text-sm font-extrabold">SocialHub</span>
      </div>
      <nav className="mt-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-wider text-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                if (item.soon) {
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted opacity-50">
                      <Icon className="h-4 w-4" />{item.label}
                      <span className="ml-auto rounded-full border border-line bg-app px-1.5 py-0.5 text-[8px] font-extrabold">soon</span>
                    </div>
                  );
                }
                return (
                  <Link key={item.href} href={item.href}
                    className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold',
                      active ? 'bg-accent-tint text-accent' : 'text-ink/70 hover:bg-app')}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
