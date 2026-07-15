'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line/80 dark:border-line/40 bg-surface/60 backdrop-blur-md">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-line/40">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-soft text-white shadow-md shadow-accent/25">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <span className="text-sm font-extrabold tracking-tight text-ink font-theme">SocialHub</span>
      </div>

      <nav className="mt-4 flex-1 space-y-6 px-3.5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-faint">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.soon) {
                  return (
                    <div key={item.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-faint">
                      <Icon className="h-4 w-4" />
                      {item.label}
                      <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 text-[9px] font-extrabold text-faint">breve</span>
                    </div>
                  );
                }
                const active = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200',
                      active 
                        ? 'bg-accent text-white shadow-md shadow-accent/20 dark:bg-accent/15 dark:text-accent dark:shadow-none dark:border-l-2 dark:border-accent dark:rounded-l-none' 
                        : 'text-muted hover:bg-surface-2 hover:text-ink'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 transition-colors', active ? 'text-white dark:text-accent' : 'text-faint group-hover:text-ink')} />
                    {item.label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90 dark:bg-accent" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line/80 dark:border-line/40 px-5 py-3.5">
        <p className="text-[10px] font-semibold text-faint">SocialHub · v2.1 Pro</p>
      </div>
    </aside>
  );
}
