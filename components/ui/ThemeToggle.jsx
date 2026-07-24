'use client';
import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

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

  // Segmented do handoff: trilho em inputBg raio 10, item ativo em accent com raio 8.
  const seg = (active) =>
    `rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
      active ? 'bg-accent text-white' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="flex items-center gap-3">
      {dateStr && (
        <div className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted md:flex">
          <CalendarIcon className="h-3.5 w-3.5 text-accent" />
          <span className="capitalize tracking-tight tabular-nums">{dateStr}</span>
        </div>
      )}
      <div className="flex items-center rounded-lg bg-surface-2 p-[3px]">
        <button type="button" onClick={() => toggle(false)} aria-pressed={!dark} className={seg(!dark)}>
          Claro
        </button>
        <button type="button" onClick={() => toggle(true)} aria-pressed={dark} className={seg(dark)}>
          Escuro
        </button>
      </div>
    </div>
  );
}
