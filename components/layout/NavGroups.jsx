'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

// Lista de navegação compartilhada pelo Sidebar (desktop) e pelo MobileNav
// (gaveta abaixo de 768px). Fonte única — muda num lugar, muda nos dois.
export function NavGroups({ canAccessAICosts = false, onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6 px-3 pb-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              if (item.adminOnly && !canAccessAICosts) return null;
              const Icon = item.icon;
              if (item.soon) {
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-faint">
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    <span>{item.label}</span>
                    <span className="ml-auto rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-faint">breve</span>
                  </div>
                );
              }
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent' : 'text-faint')} strokeWidth={2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
