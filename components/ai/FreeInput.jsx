'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Input de texto livre com dropdown de sugestões — substitui os antigos cards
// fixos de formato/tom. O usuário pode digitar qualquer coisa; as sugestões
// (por nicho + histórico da marca) são atalhos de 1 clique, não uma trava.
export function FreeInput({ value, onChange, placeholder, suggestions = [], label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15';

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-xs font-bold text-slate-200">{label}</label>}
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${field} ${suggestions.length ? 'pr-9' : ''}`}
        />
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink"
            aria-label="Ver sugestões"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              className="block w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-surface-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
