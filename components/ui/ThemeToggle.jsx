'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Calendar as CalendarIcon } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const now = new Date();
    setDateStr(now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }));
  }, []);

  function toggle(targetDark) {
    if (dark === targetDark) return;
    setDark(targetDark);
    document.documentElement.classList.toggle('dark', targetDark);
    try { localStorage.setItem('theme', targetDark ? 'dark' : 'light'); } catch {}
  }

  return (
    <div className="flex items-center gap-3">
      {dateStr && (
        <div className="hidden items-center gap-1.5 rounded-full border border-line/80 bg-surface-2/60 px-3 py-1.5 font-mono text-xs font-semibold text-muted md:flex">
          <CalendarIcon className="h-3.5 w-3.5 text-accent" />
          <span className="capitalize tracking-tight tabular-nums">{dateStr}</span>
        </div>
      )}
      <div className="flex items-center rounded-full border border-line bg-surface-2/80 p-1">
        <button
          onClick={() => toggle(false)}
          aria-label="Modo claro"
          title="Modo claro"
          className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ${
            !dark ? 'bg-surface text-amber-500 shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => toggle(true)}
          aria-label="Modo escuro"
          title="Modo escuro"
          className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ${
            dark ? 'bg-surface text-indigo-400 shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
