'use client';
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, Info, Lightbulb, RefreshCw, Sparkles, Target, TrendingUp } from 'lucide-react';
import { runInstagramAudit } from '@/lib/instagram-audit-actions';

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const CONFIANCA = {
  baixa: { texto: 'Confianca baixa — poucos dados', cor: 'text-warning' },
  media: { texto: 'Confianca media', cor: 'text-muted' },
  alta: { texto: 'Confianca alta', cor: 'text-success' }
};

function Bloco({ titulo, icone: Icone, cor, itens }) {
  if (!itens?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icone className={`h-4 w-4 ${cor}`} aria-hidden="true" />
        {titulo}
      </h3>
      <ul className="space-y-3">
        {itens.map((item, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-ink">{item.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Detalhe do que o codigo mediu — separado da leitura da IA de proposito, para
// o usuario poder conferir de onde veio cada conclusao.
function Detalhe({ summary }) {
  const [aberto, setAberto] = useState(false);
  if (!summary) return null;

  const { frequency, formats, posts, growth, bestTimes } = summary;
  const medido = bestTimes?.[0]?.basis === 'channel';

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-ink"
      >
        Ver os numeros por tras da analise
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {aberto && (
        <dl className="space-y-3 border-t border-line p-5 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Frequencia</dt>
            <dd className="text-right text-ink">{frequency.perWeek} posts por semana ({frequency.total} em {frequency.days} dias)</dd>
          </div>

          {!!formats.length && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Formatos</dt>
              <dd className="text-right text-ink">{formats.map((f) => `${f.format} ${f.share}%`).join(' · ')}</dd>
            </div>
          )}

          <div className="flex justify-between gap-4">
            <dt className="text-muted">Media de interacoes</dt>
            <dd className="text-right text-ink">{posts.average} por post</dd>
          </div>

          <div className="flex justify-between gap-4">
            <dt className="text-muted">Seguidores</dt>
            <dd className="text-right text-ink">
              {growth
                ? `${growth.start} para ${growth.end} (${growth.delta >= 0 ? '+' : ''}${growth.delta}${growth.pct === null ? '' : `, ${growth.pct}%`})`
                : 'Ainda sem historico suficiente'}
            </dd>
          </div>

          {!!bestTimes?.length && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Horarios</dt>
              <dd className="text-right text-ink">
                {bestTimes.map((t) => `${DIAS[t.weekday]} ${t.hour}h`).join(' · ')}
                <span className="block text-[11px] text-muted">{medido ? 'medido neste perfil' : 'referencia geral, nao medida deste perfil'}</span>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

export function DiagnosticoPanel({ brandId, inicial }) {
  const [audit, setAudit] = useState(inicial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const analysis = audit?.ai_analysis;
  const summary = audit?.calculated_metrics;
  const unavailable = audit?.unavailable || summary?.unavailable || [];

  async function analisar() {
    setBusy(true); setMsg(null);
    try {
      const res = await runInstagramAudit({ brandId });
      if (res?.error) throw new Error(res.error);
      setAudit({
        ai_analysis: res.analysis,
        calculated_metrics: res.summary,
        confidence: res.analysis.confidence,
        unavailable: res.summary.unavailable,
        created_at: new Date().toISOString()
      });
      if (res.warning) setMsg({ type: 'warn', text: res.warning });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const confianca = CONFIANCA[analysis?.confidence] || CONFIANCA.media;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {audit
              ? `Analisado em ${new Date(audit.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}`
              : 'Ainda sem diagnostico para esta marca.'}
          </p>
          {analysis && <p className={`text-xs font-semibold ${confianca.cor}`}>{confianca.texto}</p>}
        </div>
        <button
          type="button"
          onClick={analisar}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Analisando seu perfil...' : audit ? 'Refazer analise' : 'Analisar meu Instagram'}
        </button>
      </div>

      {msg && (
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'warn' ? 'text-warning' : 'text-danger'}`}>
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{msg.text}
        </p>
      )}

      {/* O PRD proibe a IA inventar metrica ausente; o usuario tambem merece
          saber por que o alcance nao aparece. */}
      {!!unavailable.length && audit && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            O Instagram nao liberou {unavailable.join(', ')} para esta conta, entao a analise nao considerou esses dados.
            Uma conta profissional com permissao de estatisticas mostra mais.
          </span>
        </p>
      )}

      {summary?.lowData && audit && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-muted">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>Seu perfil ainda tem poucos posts, entao esta leitura e um ponto de partida — nao uma conclusao.</span>
        </p>
      )}

      {analysis && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Bloco titulo="O que ja funciona" icone={TrendingUp} cor="text-success" itens={analysis.strengths} />
            <Bloco titulo="O que merece atencao" icone={AlertTriangle} cor="text-warning" itens={analysis.attention} />
            <Bloco titulo="Oportunidades" icone={Lightbulb} cor="text-accent" itens={analysis.opportunities} />
          </div>

          {!!analysis.priorities?.length && (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 shadow-soft">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <Target className="h-4 w-4 text-accent" aria-hidden="true" />
                Por onde comecar
              </h3>
              <ol className="space-y-2">
                {analysis.priorities.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!!analysis.openQuestions?.length && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink">O que ainda precisamos saber</h3>
              <ul className="space-y-2">
                {analysis.openQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-muted">— {q}</li>
                ))}
              </ul>
            </div>
          )}

          <Detalhe summary={summary} />
        </>
      )}
    </div>
  );
}
