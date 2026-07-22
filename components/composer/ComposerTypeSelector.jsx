'use client';
import { Image, Layers, Smartphone, Film } from 'lucide-react';

// Tiles em vez de pílulas: o seletor de formato deixa de ter a mesma forma das
// abas (Manual/Assistente) e do seletor de horário, então os três controles
// param de se confundir entre si.
const TYPES = [
  { id: 'image', label: 'Post', icon: Image, hint: '1 imagem · 1:1' },
  { id: 'carousel', label: 'Carrossel', icon: Layers, hint: 'até 10 imagens' },
  { id: 'stories', label: 'Story', icon: Smartphone, hint: '9:16 · some em 24h' },
  { id: 'reel', label: 'Reel', icon: Film, hint: 'vídeo 9:16' }
];

export function ComposerTypeSelector({ value, onChange }) {
  return (
    <div role="group" aria-label="Formato da publicação" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TYPES.map(({ id, label, icon: Icon, hint }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active
                ? 'border-accent bg-accent-tint text-accent-ink'
                : 'border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-ink'
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : ''}`} />
            <span className={`text-xs font-bold ${active ? '' : 'text-ink'}`}>{label}</span>
            <span className="text-[10px] leading-tight text-faint">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
