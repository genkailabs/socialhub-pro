import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Hero da Visão geral: a frase do produto, a ação principal e três números da
 * produção real da marca.
 *
 * Os números não são enfeite — são os mesmos estados que a lista logo abaixo
 * filtra. Se um deles for zero, ele continua aparecendo: "0 em revisão" é
 * informação, some só quando a marca não tem conteúdo nenhum (aí o hero vira
 * convite, e o bloco de números não faz sentido).
 */
export function CreativeHero({ counts, hasDraft = false }) {
  const total = (counts?.drafts || 0) + (counts?.review || 0) + (counts?.scheduled || 0) + (counts?.published || 0);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      {/* O halo é a assinatura do Aurora Grid. Fica no card do hero e em mais
          nenhum outro: se tudo brilha, nada brilha. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan/10 blur-3xl"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-8">
        <div className="min-w-0 max-w-xl">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-accent-ink">Central criativa</p>
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[34px]">
            Transforme uma ideia em conteúdo{' '}
            <span className="text-accent-ink">pronto para publicar.</span>
          </h1>
          <p className="mt-3 text-[13px] leading-[19px] text-muted">
            Planeje, crie, revise e publique sem sair do fluxo.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              href="/composer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-bold text-white shadow-aurora transition-colors hover:bg-accent-soft"
            >
              Começar uma criação <ArrowRight className="h-4 w-4" />
            </Link>
            {/* "Continuar rascunho" só existe quando existe rascunho: botão que
                não leva a lugar nenhum é promessa quebrada. */}
            {hasDraft && (
              <Link
                href="/composer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-accent/40"
              >
                Continuar rascunho
              </Link>
            )}
          </div>
        </div>

        {total > 0 && (
          <dl className="flex flex-wrap gap-3">
            <HeroStat value={counts.drafts} label="rascunhos" />
            <HeroStat value={counts.review} label="em revisão" />
            <HeroStat value={counts.scheduled} label="agendados" tone="lime" />
          </dl>
        )}
      </div>
    </section>
  );
}

function HeroStat({ value, label, tone = 'accent' }) {
  return (
    <div className="min-w-[104px] rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <dd className={`font-mono text-[22px] font-bold leading-none tabular-nums ${tone === 'lime' ? 'text-success' : 'text-ink'}`}>
        {String(value ?? 0).padStart(2, '0')}
      </dd>
      <dt className="mt-1.5 text-[11px] text-muted">{label}</dt>
    </div>
  );
}

/** Estado sem marca: o hero vira convite, sem número nenhum para mostrar. */
export function CreativeHeroEmpty() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-lift">
      <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative max-w-xl">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          Comece criando sua primeira marca
        </h1>
        <p className="mt-2 text-[13px] leading-[19px] text-muted">
          Use o seletor no topo (“Nova marca”) para criar a marca e ligar as redes. Sem marca, o Hub não
          tem de quem falar.
        </p>
      </div>
    </section>
  );
}
