'use client';
import { Sparkles, Loader2 } from 'lucide-react';

// 4 ângulos de conteúdo sugeridos pela IA p/ o tema digitado. 1 clique aplica
// o ângulo (formato + tom); o usuário pode ignorar e seguir digitando livre.
export function SuggestionChips({ suggestions, loading, onPick }) {
  if (!loading && !suggestions.length) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <Sparkles className="h-3.5 w-3.5 text-accent" /> Sugestões rápidas da IA
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando em ângulos para o tema…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {suggestions.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-xl border border-line bg-surface p-2.5 text-left text-xs transition hover:border-accent/50 hover:bg-accent/5"
              title={s.description}
            >
              <p className="font-bold text-ink">{s.title}</p>
              <p className="mt-0.5 truncate text-faint">{s.impliedFormat}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
