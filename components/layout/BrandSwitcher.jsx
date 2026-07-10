'use client';
import { ChevronDown } from 'lucide-react';

export function BrandSwitcher() {
  return (
    <button className="flex items-center gap-2 rounded-xl border border-line bg-app px-2.5 py-1.5 text-xs font-bold text-ink"
      title="Seleção de marca chega no M2" disabled>
      <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[9px] font-extrabold text-white">—</span>
      Nenhuma marca
      <ChevronDown className="h-3.5 w-3.5 text-muted" />
    </button>
  );
}
