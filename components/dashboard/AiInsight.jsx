import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const WEEKDAY = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * O que o Hub percebeu sobre a marca. Ciano, porque no Aurora Grid ciano é
 * descoberta — nunca roxo, que é o que a pessoa cria.
 *
 * O insight é calculado, não inventado: sai do histórico de melhor horário
 * (getYoutubeBestTimes). Sem histórico suficiente, o card diz o que falta para
 * ele existir, em vez de encher linguiça com conselho genérico.
 */
export function AiInsight({ bestTime = null }) {
  const hasInsight = Boolean(bestTime);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan/10 blur-2xl" />
      <div className="relative flex items-start gap-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan/15 text-cyan-ink">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-cyan-ink">Insight da IA</p>
          <h2 className="mt-1.5 text-[15px] font-bold leading-[21px] tracking-tight text-ink">
            {hasInsight
              ? `Seu público responde melhor ${WEEKDAY[bestTime.weekday]} às ${String(bestTime.hour).padStart(2, '0')}h.`
              : 'Ainda não dá para dizer qual é o seu melhor horário.'}
          </h2>
          <p className="mt-2 text-[12.5px] leading-[18px] text-muted">
            {hasInsight
              ? 'Vale mirar a próxima publicação nesse horário e comparar o alcance com o das outras.'
              : 'Publique com constância por algumas semanas: é do seu próprio histórico que esse cálculo sai.'}
          </p>
          <Link
            href={hasInsight ? '/planning' : '/composer'}
            className="mt-4 inline-flex items-center rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-[12px] font-bold text-ink transition-colors hover:border-cyan/50"
          >
            {hasInsight ? 'Ver planejamento' : 'Criar agora'}
          </Link>
        </div>
      </div>
    </div>
  );
}
