'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[212px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-white shadow-soft">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-sm font-extrabold tracking-tight">SocialHub</span>
      </div>

      <nav className="mt-1 flex-1 space-y-5 px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-faint">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.soon) {
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-faint">
                      <Icon className="h-[18px] w-[18px]" />{item.label}
                      <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 text-[9px] font-extrabold text-faint">breve</span>
                    </div>
                  );
                }
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={cn('group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors',
                      active ? 'bg-accent-tint text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink')}>
                    <Icon className={cn('h-[18px] w-[18px] transition-colors', active ? 'text-accent' : 'text-faint group-hover:text-ink')} />
                    {item.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-3">
        <p className="text-[10px] font-semibold text-faint">SocialHub · v2</p>
      </div>
    </aside>
  );
}
