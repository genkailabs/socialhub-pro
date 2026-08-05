import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { NavGroups } from './NavGroups';
import { cn } from '@/lib/utils';

// Sidebar fixa do desktop. Abaixo de 768px ela some e o menu vira gaveta
// (MobileNav, aberta pelo hambúrguer no Topbar) — RF-20.
// `collapsed`: recolhida para 76px (só ícones), alternada pelo botão no Topbar.
export function Sidebar({ collapsed = false, canAccessAICosts = false, accountEmail = '' }) {
  const account = accountEmail || 'Conta';
  const initials = (accountEmail || '?').replace(/@.*/, '').slice(0, 2).toUpperCase();
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col justify-between border-r border-line bg-panel transition-[width] duration-300 ease-emphasized md:flex',
        collapsed ? 'w-[76px]' : 'w-[228px]'
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Logo */}
        <div className={cn('flex h-16 items-center gap-3', collapsed ? 'justify-center px-0' : 'px-5')}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-white">
            <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-[15px] font-bold leading-tight tracking-tight text-ink">SocialHub</span>
              <span className="block text-[9.5px] font-bold uppercase tracking-[0.14em] text-faint">Creative OS</span>
            </span>
          )}
        </div>

        {/* A ação de criar é a única em destaque no menu inteiro: no Aurora o
            roxo é a cor de criação, e ela aparece uma vez por tela. Recolhida,
            vira o ícone — o botão não some, encolhe. */}
        <div className={cn('pb-1', collapsed ? 'px-3' : 'px-3')}>
          <Link
            href="/composer"
            title={collapsed ? 'Criar conteúdo' : undefined}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-accent text-[13px] font-bold text-white shadow-aurora transition-colors hover:bg-accent-soft',
              collapsed ? 'h-10 w-10 px-0' : 'h-11 w-full px-4'
            )}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            {!collapsed && <span>Criar conteúdo</span>}
          </Link>
        </div>

        <div className="mt-4">
          <NavGroups collapsed={collapsed} canAccessAICosts={canAccessAICosts} />
        </div>
      </div>

      {/* Perfil no rodapé */}
      <div className="border-t border-line p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl py-2 transition-colors hover:bg-surface-2',
            collapsed ? 'justify-center px-0' : 'px-2.5'
          )}
          title={collapsed ? account : undefined}
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink" title={account}>{account}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
