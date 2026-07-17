'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Calendar, Check, Sparkles, Target, Undo2, Wand2, X } from 'lucide-react';
import { generateWeekPlan, setPlanItemStatus } from '@/lib/planning-actions';
import { produceFromPlanItem } from '@/lib/content-actions';
import { planProgress, ITEM_STATUS } from '@/lib/strategy-plan';
import { formatLabel } from '@/lib/content-production';
import { Button } from '@/components/ui/Button';

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function dataCurta(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const TOM = {
  proposed: 'border-line bg-surface',
  approved: 'border-success/40 bg-success/5',
  rejected: 'border-line bg-surface opacity-50',
  produced: 'border-accent/40 bg-accent/5'
};

function Tema({ item, onStatus, onProduce, busy }) {
  const meta = ITEM_STATUS[item.status] || ITEM_STATUS.proposed;
  const removido = item.status === 'rejected';
  const produzido = item.status === 'produced' && item.post_id;

  return (
    <li className={`rounded-2xl border p-4 transition-colors ${TOM[item.status] || TOM.proposed}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{dataCurta(item.date)}</span>
            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{formatLabel(item.format)}</span>
            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{item.pillar}</span>
            {item.status !== 'proposed' && (
              <span className={`text-[10px] font-bold ${meta.tone === 'success' ? 'text-success' : meta.tone === 'accent' ? 'text-accent' : 'text-muted'}`}>
                {meta.label}
              </span>
            )}
          </div>

          <p className={`mt-1.5 text-sm font-bold text-ink ${removido ? 'line-through' : ''}`}>{item.title}</p>
          <p className="mt-0.5 text-xs text-muted">{item.topic}</p>

          <dl className="mt-2 space-y-1 text-[11px] text-faint">
            <div><dt className="inline font-semibold">Por que: </dt><dd className="inline">{item.rationale}</dd></div>
            <div><dt className="inline font-semibold">Chamada: </dt><dd className="inline">{item.cta}</dd></div>
          </dl>
        </div>

        {/* Produzido: o tema virou conteudo e o trabalho continua na revisao. */}
        {produzido && (
          <Link
            href={`/content/${item.post_id}/review`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent/15"
          >
            Ver conteudo<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}

        {/* Aprovar e remover nao chamam IA e nao custam credito (§12.4). */}
        {item.status !== 'produced' && (
          <div className="flex shrink-0 gap-1.5">
            {/* Só aqui a IA escreve de verdade — e só para tema aprovado. */}
            {item.status === 'approved' && (
              <Button size="sm" onClick={() => onProduce(item.id)} disabled={busy === item.id}>
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                {busy === item.id ? 'Criando...' : 'Criar conteudo'}
              </Button>
            )}
            {item.status !== 'approved' && (
              <Button size="sm" onClick={() => onStatus(item.id, 'approved')} disabled={busy === item.id}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />Aprovar
              </Button>
            )}
            {item.status === 'proposed' && (
              <Button variant="ghost" size="sm" onClick={() => onStatus(item.id, 'rejected')} disabled={busy === item.id}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />Remover
              </Button>
            )}
            {item.status !== 'proposed' && (
              <Button variant="ghost" size="sm" onClick={() => onStatus(item.id, 'proposed')} disabled={busy === item.id}>
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />Desfazer
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function PlanningPanel({ brandId, weekStart, plan, hasStrategy }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState(null);

  const itens = plan?.items || [];
  const progresso = planProgress(itens);

  async function gerar() {
    setGerando(true); setMsg(null);
    try {
      const res = await generateWeekPlan({ brandId, weekStart });
      if (res?.error) throw new Error(res.error);
      if (res.discarded > 0) {
        setMsg({ type: 'warn', text: `${res.count} temas sugeridos. ${res.discarded} foram descartados por cair fora desta semana.` });
      }
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setGerando(false);
    }
  }

  async function mudarStatus(itemId, status) {
    setBusy(itemId); setMsg(null);
    try {
      const res = await setPlanItemStatus({ itemId, status });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy('');
    }
  }

  async function produzir(itemId) {
    setBusy(itemId); setMsg(null);
    try {
      const res = await produceFromPlanItem({ itemId });
      if (res?.error) throw new Error(res.error);
      // Bloqueado pela revisão não some: vira rascunho e a pessoa decide.
      if (res.blocked) setMsg({ type: 'warn', text: 'Conteudo criado, mas a revisao pediu atencao. Abra para ver o que ajustar.' });
      router.refresh();
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy('');
    }
  }

  // RF-05: estrategia antes do plano.
  if (!hasStrategy) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center">
        <Target className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-ink">Primeiro, a estrategia</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
          Antes de escolher os temas da semana, o Social Hub precisa saber por que a sua marca publica.
          Aprove uma estrategia em Piloto Automatico e volte aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <Calendar className="h-4 w-4 text-muted" aria-hidden="true" />
            Semana de {dataCurta(weekStart)}
          </p>
          {!!itens.length && (
            <p className="mt-0.5 text-xs text-muted">
              {progresso.approved} de {progresso.total} temas aprovados
              {progresso.rejected > 0 && ` · ${progresso.rejected} removidos`}
            </p>
          )}
        </div>
        <Button onClick={gerar} disabled={gerando}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {gerando ? 'Planejando...' : itens.length ? 'Sugerir de novo' : 'Planejar minha semana'}
        </Button>
      </div>

      {msg && (
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'warn' ? 'text-warning' : 'text-danger'}`}>
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{msg.text}
        </p>
      )}

      {!itens.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center">
          <p className="text-sm font-bold text-ink">Nenhum tema planejado ainda</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
            O Social Hub sugere os temas da semana com base na sua estrategia. Nada e criado agora —
            so os temas que voce aprovar viram conteudo de verdade.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-soft">
            {itens.map((item) => (
              <Tema key={item.id} item={item} onStatus={mudarStatus} onProduce={produzir} busy={busy} />
            ))}
          </ul>

          {progresso.readyToProduce && (
            <p className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-xs text-muted">
              {progresso.approved} {progresso.approved === 1 ? 'tema aprovado' : 'temas aprovados'}. Clique em
              &ldquo;Criar conteudo&rdquo; em cada um — so ai a IA escreve a legenda e monta a arte, e so para o
              que voce aprovou.
            </p>
          )}
        </>
      )}
    </div>
  );
}
