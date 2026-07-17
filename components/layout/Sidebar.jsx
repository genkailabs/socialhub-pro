'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, CircleDollarSign } from 'lucide-react';
import { NAV_GROUPS } from '@/data/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-[230px] shrink-0 flex-col justify-between border-r border-line bg-surface">
      <div>
        {/* Logo Sales-Ops */}
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm">
            <CircleDollarSign className="h-5 w-5 font-extrabold" />
          </span>
          <span className="font-bold text-lg text-ink tracking-tight flex items-center gap-1.5">
            SocialHub
            <span className="rounded bg-accent/15 border border-accent/30 px-1.5 py-0.5 text-xs text-accent font-mono font-bold">PRO</span>
          </span>
        </div>

        {/* Navegação */}
        <nav className="mt-3 flex-1 space-y-5 px-3 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-faint">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if (item.soon) {
                    return (
                      <div key={item.label} className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-faint">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                        <span className="ml-auto rounded border border-line px-1.5 py-0.5 text-[10px] font-mono font-bold text-faint">breve</span>
                      </div>
                    );
                  }
                  const active = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                        active 
                          ? 'bg-transparent text-accent' 
                          : 'text-muted hover:bg-surface-2/70 hover:text-ink'
                      )}
                    >
                      {/* Pílula vertical esquerda esmeralda no item ativo */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-accent shadow-lg shadow-accent/50" />
                      )}
                      <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200', active ? 'text-accent' : 'text-faint group-hover:text-ink group-hover:scale-110')} />
                      <span>{item.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Perfil Enterprise no rodapé */}
        <div className="border-t border-line bg-surface p-4">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
            GE
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">GenkaiLabs</p>
            <p className="font-mono text-[10px] text-accent">Plano Enterprise</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
