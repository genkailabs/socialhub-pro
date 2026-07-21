'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

// Lista de navegação compartilhada pelo Sidebar (desktop) e pelo MobileNav
// (gaveta abaixo de 768px). Fonte única — muda num lugar, muda nos dois.
// `collapsed`: sidebar recolhida (76px) — esconde labels/headers, só ícones.
export function NavGroups({ canAccessAICosts = false, onNavigate, collapsed = false }) {
  const pathname = usePathname();
  return (
    <nav className={cn('flex flex-col gap-5 pb-4', collapsed ? 'px-2' : 'px-3')}>
      {NAV_GROUPS.map((group, gi) => (
        <div
          key={group.label || `group-${gi}`}
          className={cn(group.isolated && 'mt-1 border-t border-line pt-4')}
        >
          {group.label && !collapsed && (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              if (item.adminOnly && !canAccessAICosts) return null;
              const Icon = item.icon;
              if (item.soon) {
                return (
                  <div
                    key={item.label}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-faint',
                      collapsed ? 'justify-center px-0' : 'px-3'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                    {!collapsed && (
                      <>
                        <span>{item.label}</span>
                        <span className="ml-auto rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-faint">breve</span>
                      </>
                    )}
                  </div>
                );
              }
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    active
                      ? 'bg-accent/10 text-accent'
                      : group.isolated
                        ? 'text-faint hover:bg-surface-2 hover:text-ink'
                        : 'text-muted hover:bg-surface-2 hover:text-ink'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-accent' : 'text-faint')} strokeWidth={2} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
