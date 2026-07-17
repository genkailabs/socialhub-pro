'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Sparkles, Target } from 'lucide-react';
import { generateStrategy, approveStrategy } from '@/lib/strategy-actions';
import { activeStrategy } from '@/lib/strategy-plan';
import { Button } from '@/components/ui/Button';

const periodo = (s) => {
  const f = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${f(s.period_start)} a ${f(s.period_end)}`;
};

function Resumo({ s }) {
  const pilares = s.pillars || [];
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Objetivo do ciclo</p>
        <p className="text-sm text-ink">{s.objectives?.main}</p>
      </div>

      {s.objectives?.audience && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Para quem</p>
          <p className="text-sm text-ink">{s.objectives.audience}</p>
        </div>
      )}

      {!!pilares.length && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Sobre o que falar</p>
          <ul className="mt-1 space-y-1.5">
            {pilares.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">{p.share}%</span>
                <span><strong className="text-ink">{p.name}</strong> <span className="text-muted">— {p.description}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.rationale && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Por que assim</p>
          <p className="text-xs leading-relaxed text-muted">{s.rationale}</p>
        </div>
      )}

      {!!(s.indicators || []).length && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">O que vamos observar</p>
          <p className="text-xs text-muted">{s.indicators.join(' · ')}</p>
        </div>
      )}
    </div>
  );
}

// Estrategia de conteudo (PRD Etapa 8) dentro do Piloto, que ja era onde
// pilares e cadencia viviam. A IA propoe; so a aprovacao coloca em uso.
export function StrategyPanel({ brandId, strategies = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(null);

  const ativa = activeStrategy(strategies);
  const proposta = strategies.find((s) => s.status === 'proposed');

  async function gerar() {
    setBusy(true); setErro(null);
    try {
      const res = await generateStrategy({ brandId });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (e) { setErro(e.message); } finally { setBusy(false); }
  }

  async function aprovar(id) {
    setBusy(true); setErro(null);
    try {
      const res = await approveStrategy({ brandId, strategyId: id });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (e) { setErro(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Target className="h-4 w-4 text-muted" aria-hidden="true" />
            Estrategia de conteudo
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {ativa ? `Em uso · ${periodo(ativa)}` : 'Define por que a sua marca publica, antes de escolher os temas.'}
          </p>
        </div>
        <Button variant={ativa ? 'ghost' : 'default'} size="sm" onClick={gerar} disabled={busy}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {busy ? 'Pensando...' : ativa ? 'Sugerir nova' : 'Criar estrategia'}
        </Button>
      </div>

      {erro && (
        <p className="flex items-start gap-1.5 text-xs font-semibold text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{erro}
        </p>
      )}

      {proposta && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <p className="text-sm font-bold text-ink">
            {ativa ? 'Nova estrategia proposta' : 'Sua estrategia esta pronta'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {ativa ? 'A atual continua valendo ate voce aprovar esta.' : 'Revise e aprove para planejar a semana.'}
          </p>
          <div className="mt-3"><Resumo s={proposta} /></div>
          <Button className="mt-4" onClick={() => aprovar(proposta.id)} disabled={busy}>
            <Check className="h-4 w-4" aria-hidden="true" />Aprovar estrategia
          </Button>
        </div>
      )}

      {ativa && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-success">Em uso</p>
          <Resumo s={ativa} />
        </div>
      )}

      {!ativa && !proposta && (
        <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-5 text-center">
          <p className="text-xs leading-relaxed text-muted">
            Sem estrategia, o Social Hub so consegue gerar posts avulsos.
            Com ela, cada conteudo tem um motivo — e a semana faz sentido junta.
          </p>
        </div>
      )}
    </div>
  );
}
