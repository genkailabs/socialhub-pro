import { Sparkles } from 'lucide-react';
import { NavGroups } from './NavGroups';

// Sidebar fixa do desktop. Abaixo de 768px ela some e o menu vira gaveta
// (MobileNav, aberta pelo hambúrguer no Topbar) — RF-20.
export function Sidebar({ canAccessAICosts = false, accountEmail = '' }) {
  const account = accountEmail || 'Conta';
  const initials = (accountEmail || '?').replace(/@.*/, '').slice(0, 2).toUpperCase();
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col justify-between border-r border-line bg-surface md:flex">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-[0_4px_12px_-2px_rgb(var(--c-accent)/0.5)]">
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">SocialHub</span>
        </div>

        <div className="mt-2">
          <NavGroups canAccessAICosts={canAccessAICosts} />
        </div>
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
