'use client';
import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { BrandSwitcher } from './BrandSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { signOut } from '@/app/login/actions';

export function Topbar({ brands, activeId }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface/90 px-6 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-6">
        <BrandSwitcher brands={brands} activeId={activeId} />
      </div>

      <div className="flex items-center gap-4">
        {/* Barra de busca escuro pill com borda fina */}
        <div className={`relative flex items-center transition-all duration-300 ${searchFocused ? 'w-64' : 'w-52'}`}>
          <Search className="absolute left-3.5 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar no hub..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-4 rounded-full bg-surface-2 border border-line text-xs text-ink placeholder:text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all duration-200"
          />
        </div>

        {/* Notificações — sem indicador falso: só mostra ponto quando houver
            dado real de não-lida (RF-18). Até lá, apenas o sino. */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 border border-line text-muted transition-colors hover:text-ink hover:border-accent/40"
        >
          <Bell className="h-4 w-4" />
        </button>

        <ThemeToggle />

        <div className="h-5 w-px bg-line" />

        <form action={signOut}>
          <button 
            type="submit" 
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
