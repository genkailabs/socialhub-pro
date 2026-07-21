'use client';
import { Image, Layers, Smartphone, Film } from 'lucide-react';

const TYPES = [
  { id: 'image', label: 'Post', icon: Image },
  { id: 'carousel', label: 'Carrossel', icon: Layers },
  { id: 'stories', label: 'Story', icon: Smartphone },
  { id: 'reel', label: 'Reel', icon: Film }
];

export function ComposerTypeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-surface-2 p-1">
      {TYPES.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
              active
                ? 'bg-surface text-accent shadow-soft'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
