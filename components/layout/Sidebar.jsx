'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar({ canAccessAICosts = false, accountEmail = '' }) {
  const pathname = usePathname();
  const account = accountEmail || 'Conta';
  const initials = (accountEmail || '?').replace(/@.*/, '').slice(0, 2).toUpperCase();
  return (
    <aside className="flex w-[240px] shrink-0 flex-col justify-between border-r border-line bg-surface">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-[0_4px_12px_-2px_rgb(var(--c-accent)/0.5)]">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">SocialHub</span>
        </div>

        {/* Navegação */}
        <nav className="mt-2 space-y-6 px-3 pb-4">
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
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-accent/10 text-accent'
                          : 'text-muted hover:bg-surface-2 hover:text-ink'
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
      </div>

      {/* Perfil no rodapé */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-surface-2 transition-colors">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink" title={account}>{account}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
