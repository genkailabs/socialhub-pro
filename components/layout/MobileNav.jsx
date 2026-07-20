'use client';
import { useEffect, useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import { NavGroups } from './NavGroups';

// Gaveta de navegação para telas < 768px (RF-20). O hambúrguer vive no Topbar;
// no desktop (md+) todo este bloco fica escondido — lá o Sidebar fixo assume.
export function MobileNav({ canAccessAICosts = false, accountEmail = '' }) {
  const [open, setOpen] = useState(false);
  const account = accountEmail || 'Conta';
  const initials = (accountEmail || '?').replace(/@.*/, '').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted transition-colors hover:text-ink"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] max-w-[80%] flex-col justify-between border-r border-line bg-surface shadow-xl">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex h-16 items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-[0_4px_12px_-2px_rgb(var(--c-accent)/0.5)]">
                    <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.5} />
                  </span>
                  <span className="text-[17px] font-bold tracking-tight text-ink">SocialHub</span>
                </div>
                <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2">
                <NavGroups canAccessAICosts={canAccessAICosts} onNavigate={() => setOpen(false)} />
              </div>
            </div>
            <div className="border-t border-line p-3">
              <div className="flex items-center gap-3 rounded-xl px-2.5 py-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink" title={account}>{account}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
