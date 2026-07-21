'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Compass, Sparkles, Target } from 'lucide-react';
import { generateStrategy, approveStrategy } from '@/lib/strategy-actions';
import { activeStrategy } from '@/lib/strategy-plan';
import { Button } from '@/components/ui/Button';

const periodo = (s) => {
  const f = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${f(s.period_start)} a ${f(s.period_end)}`;
};

// Direção principal — cabeçalho da estratégia (§ layout Pencil), sourced 100%
// do que a IA propôs: nada de meta numerica inventada quando não existe.
function DirecaoPrincipal({ s }) {
  return (
    <div className="flex flex-col gap-5 rounded-[24px] border border-line bg-surface-2 p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] bg-accent">
          <Compass className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Direcao principal</p>
          <h2 className="mt-1 text-lg font-bold leading-tight tracking-tight text-ink sm:text-[22px]">{s.objectives?.main}</h2>
          {s.rationale && <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-muted">{s.rationale}</p>}
        </div>
      </div>
      {!!(s.indicators || []).length && (
        <div className="shrink-0 rounded-2xl bg-surface p-3.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">O que vamos observar</p>
          <p className="mt-1 font-mono text-sm font-bold text-ink">{s.indicators[0]}</p>
        </div>
      )}
    </div>
  );
}

// Pilares que orientam o conteúdo — cards 1:1 com o que a IA definiu.
function Pilares({ pillars }) {
  if (!pillars?.length) return null;
  return (
    <div>
      <h3 className="text-base font-bold tracking-tight text-ink">Pilares que vao orientar o conteudo</h3>
      <p className="mt-0.5 text-[11px] text-muted">Cada conteudo deve reforcar pelo menos um deles.</p>
      {/* Sistema uniforme: índice mono + barra de % do conteúdo (sem card escuro alternado) */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <p className="font-mono text-xs font-bold text-accent">{String(i + 1).padStart(2, '0')}</p>
            <p className="mt-2 text-[15px] font-bold text-ink">{p.name}</p>
            <p className="mt-2.5 text-xs leading-relaxed text-muted">{p.description}</p>
            {typeof p.share === 'number' && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted">do conteúdo</span>
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-accent">{p.share}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, p.share)}%` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Resumo({ s }) {
  return (
    <div className="space-y-5">
      <DirecaoPrincipal s={s} />
      <Pilares pillars={s.pillars} />

      {s.objectives?.audience && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Para quem</p>
          <p className="text-sm text-ink">{s.objectives.audience}</p>
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
