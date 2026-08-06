'use client';
import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const now = new Date();
    // `capitalize` do Tailwind maiúsculiza TODA palavra e escrevia
    // "Qua., 5 De Ago.". Em português só a primeira letra sobe.
    const formatted = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
    setDateStr(formatted.charAt(0).toUpperCase() + formatted.slice(1));
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
          <span className="tracking-tight tabular-nums">{dateStr}</span>
        </div>
      )}
      {/* Em 390px os dois rótulos não cabem: "Claro" era cortado no meio e o
          sino escorregava por cima do nome da marca. No celular o mesmo
          controle vira um botão de ícone que alterna entre os dois temas. */}
      <button
        type="button"
        onClick={() => toggle(!dark)}
        aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted transition-colors hover:border-accent/40 hover:text-ink sm:hidden"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="hidden items-center rounded-lg bg-surface-2 p-[3px] sm:flex">
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
