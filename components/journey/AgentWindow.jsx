'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Mascot } from '@/components/onboarding/Mascot';
import { leaveJourney, refreshJourney } from '@/lib/journey-actions';
import { JOURNEY_COPY } from './journey-copy';
import { StepBrand } from './steps/StepBrand';
import { StepConnect } from './steps/StepConnect';
import { StepDiagnose } from './steps/StepDiagnose';
import { StepDna } from './steps/StepDna';
import { StepStrategy } from './steps/StepStrategy';
import { StepPlan } from './steps/StepPlan';

const BODIES = {
  brand: StepBrand,
  connect: StepConnect,
  diagnose: StepDiagnose,
  dna: StepDna,
  strategy: StepStrategy,
  plan: StepPlan
};

/*
 * A janela do Hub durante a jornada do primeiro uso.
 *
 * Ela não guarda o progresso: quem sabe a etapa é o servidor, que deriva de
 * fatos do banco. Depois de cada ação a janela só pede router.refresh() e o
 * passo anda sozinho. É por isso que não existe máquina de estados aqui — e por
 * isso conectar o Instagram por fora, pela tela de Conexões, também funciona.
 *
 * z-[45]: acima da Topbar (z-30) e do MascotTip (z-40), abaixo dos modais (z-50).
 */
export function AgentWindow({ journey, brandId, brandName }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('journey-agent:collapsed') === '1');
    } catch {
      // localStorage bloqueado: a janela abre, que é o padrão seguro.
    }
    setHydrated(true);
  }, []);

  if (!journey?.conducting) return null;
  // Antes de ler a preferência não renderiza, para não piscar aberta na cara de
  // quem tinha recolhido.
  if (!hydrated) return null;

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('journey-agent:collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  // Envelope único das ações: trava o botão, mostra o erro em vez de engolir, e
  // nunca deixa `busy` preso se a action explodir.
  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (res?.error) {
        setError(res.error);
        return null;
      }
      return res || { ok: true };
    } catch (e) {
      setError(e?.message || 'Algo deu errado aqui. Tente de novo.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Concluído um passo, duas coisas precisam acontecer — e faltavam as duas.
  //
  // 1. invalidar o layout, senão a etapa continua a antiga (o cache do payload
  //    do layout sobrevive a um router.refresh());
  // 2. LEVAR a pessoa para a tela do próximo passo. O gate do servidor só
  //    reposiciona quando há navegação; parada na mesma rota, ela ficava
  //    olhando a tela anterior até apertar F5.
  async function advance() {
    await refreshJourney();
    const proximo = journey.currentIndex >= 0 ? journey.steps[journey.currentIndex + 1] : null;
    if (proximo && proximo.route !== pathname) {
      router.push(proximo.route);
    }
    router.refresh();
  }

  const step = journey.currentStep;
  const copy = JOURNEY_COPY[step?.id] || JOURNEY_COPY.brand;
  const Body = BODIES[step?.id];

  // Recolhida ela sai do centro e vira uma pílula no canto: no centro atrapalha
  // exatamente quem pediu para ela sair da frente.
  if (collapsed) {
    return (
      <div className="animate-agent-enter fixed bottom-5 right-5 z-[45]">
        <button
          type="button"
          onClick={toggle}
          className="agent-window animate-agent-float inline-flex items-center gap-2 rounded-full border bg-surface py-1.5 pl-1.5 pr-4 text-[12px] font-semibold text-ink transition-colors hover:border-accent/40"
        >
          <Mascot mood="guide" className="h-8 w-7 shrink-0" />
          Passo {journey.stepNumber} de {journey.totalSteps}
        </button>
      </div>
    );
  }

  // Centralizada, e não ancorada num canto: no primeiro uso a decisão é uma só,
  // e ela merece o centro do olhar. O container cobre a tela inteira só para
  // centralizar — pointer-events-none devolve o clique ao app atrás, então o
  // fundo continua visível E utilizável. Quem trava a navegação é o gate no
  // servidor, não uma cortina.
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] grid place-items-center p-4">
      <div
        role="dialog"
        aria-label="Hub conduzindo a configuração"
        className="animate-agent-enter pointer-events-auto w-full max-w-[420px]"
      >
        <div className="agent-window animate-agent-float max-h-[78vh] overflow-auto rounded-3xl border bg-surface p-5">
        <div className="flex items-start gap-3">
          <Mascot mood="guide" className="h-[54px] w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent">
              Passo {journey.stepNumber} de {journey.totalSteps}
            </p>
            <p className="mt-0.5 text-[14px] font-bold leading-snug text-ink">{copy.title}</p>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="Recolher o Hub"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.round((journey.doneCount / journey.totalSteps) * 100)}%` }}
          />
        </div>

        <ul className="mt-3 space-y-1.5">
          {copy.lines.map((line) => (
            <li key={line} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] leading-snug text-danger">
            {error}
          </p>
        )}

        <div className="mt-3.5">
          {Body && (
            <Body brandId={brandId} brandName={brandName} run={run} busy={busy} advance={advance} />
          )}
        </div>

        {/* Válvula de escape. Sem ela, qualquer defeito no gate prende a pessoa. */}
        {brandId && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => { await run(() => leaveJourney({ brandId })); router.refresh(); }}
            className="mt-3 text-[11.5px] font-medium text-faint underline underline-offset-2 transition-colors hover:text-muted disabled:opacity-50"
          >
            Prefiro explorar sozinho
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
