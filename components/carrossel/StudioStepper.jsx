'use client';
import { Check } from 'lucide-react';

/**
 * Ideia → Roteiro → Visual → Revisão, no topo do Studio.
 *
 * Os quatro passos são estados que existem de verdade no fluxo do carrossel:
 *
 *   Ideia    — assunto escolhido e capa selecionada (a gaveta editorial);
 *   Roteiro  — roteiro montado, à espera de conferência;
 *   Visual   — roteiro aplicado, a arte sendo montada no editor;
 *   Revisão  — virou rascunho de post, pronto para agendar ou publicar.
 *
 * Clicar num passo faz o que ele significa: os dois primeiros abrem a gaveta
 * editorial, os dois últimos a fecham para o canvas ocupar a tela. Passo à
 * frente do atual não é clicável — não dá para revisar o que ainda não existe.
 */
const STEPS = [
  { id: 'ideia', label: 'Ideia' },
  { id: 'roteiro', label: 'Roteiro' },
  { id: 'visual', label: 'Visual' },
  { id: 'revisao', label: 'Revisão' }
];

/** Em qual dos quatro o carrossel está agora (0–3). */
export function currentStudioStep({ applied = false, hasBrief = false, hasDraft = false } = {}) {
  if (applied && hasDraft) return 3;
  if (applied) return 2;
  if (hasBrief) return 1;
  return 0;
}

export function StudioStepper({ current = 0, onOpenEditorial, onFocusCanvas }) {
  return (
    <ol className="flex items-center gap-1" aria-label="Etapas do carrossel">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const reachable = index <= current;
        return (
          <li key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!reachable}
              aria-current={active ? 'step' : undefined}
              onClick={() => (index <= 1 ? onOpenEditorial?.() : onFocusCanvas?.())}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? 'bg-accent/15 text-accent-ink'
                  : done
                    ? 'text-muted hover:bg-surface-2 hover:text-ink'
                    : 'cursor-default text-faint'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${
                  done ? 'bg-success/20 text-success' : active ? 'bg-accent text-white' : 'bg-surface-3 text-faint'
                }`}
              >
                {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
              </span>
              {step.label}
            </button>
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className={`h-px w-4 ${index < current ? 'bg-success/50' : 'bg-line'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
