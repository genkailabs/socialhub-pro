'use client';
import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { BrandSwitcher } from './BrandSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { signOut } from '@/app/login/actions';

export function Topbar({ brands, activeId }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line/80 dark:border-line/40 bg-app/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <BrandSwitcher brands={brands} activeId={activeId} />
      </div>

      <div className="flex items-center gap-3.5">
        {/* Barra de busca / filtro interativo */}
        <div className={`relative flex items-center transition-all duration-300 ${searchFocused ? 'w-64' : 'w-48'}`}>
          <Search className="absolute left-3 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar no hub..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface-2 border border-line/80 dark:border-line/40 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
          />
        </div>

        {/* Notificações pulsantes */}
        <button 
          type="button" 
          aria-label="Notificações"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-muted transition-colors hover:bg-surface-2/80 hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent animate-pulse" />
        </button>

        <ThemeToggle />

        <div className="h-5 w-px bg-line/80 dark:bg-line/40" />

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
