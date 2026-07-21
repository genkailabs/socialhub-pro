'use client';
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, Info, Lightbulb, RefreshCw, Sparkles, TrendingUp, Users, Radio } from 'lucide-react';
import { runInstagramAudit } from '@/lib/instagram-audit-actions';

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const CONFIANCA = {
  baixa: { texto: 'Confianca baixa — poucos dados', cor: 'text-warning', pct: 34, nivel: 'Poucos dados' },
  media: { texto: 'Confianca media', cor: 'text-muted', pct: 64, nivel: 'Razoavel' },
  alta: { texto: 'Confianca alta', cor: 'text-success', pct: 92, nivel: 'Muito boa' }
};

const FORCA_ICONS = [Users, Radio, Sparkles];
const PRIORIDADE_LABEL = ['Alta', 'Impacto', 'Media'];

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
  const circ = 2 * Math.PI * 40;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">Diagnostico do perfil</h1>
          <p className="mt-1 text-[13px] text-muted">
            {audit
              ? `Analisado em ${new Date(audit.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}`
              : 'Uma visao pratica do que esta funcionando e do que merece atencao.'}
          </p>
        </div>
        <button
          type="button"
          onClick={analisar}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgb(var(--c-accent)/0.5)] transition-opacity disabled:opacity-60"
        >
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Analisando...' : audit ? 'Atualizar analise' : 'Analisar meu Instagram'}
        </button>
      </div>

      {analysis && (
        <div className="flex flex-col items-center gap-6 rounded-[24px] bg-[#211E1B] p-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Confianca da analise</p>
            <p className={`mt-2 font-mono text-[40px] font-bold leading-none ${confianca.cor === 'text-success' ? 'text-success' : confianca.cor === 'text-warning' ? 'text-warning' : 'text-white'}`}>
              {confianca.nivel}
            </p>
            <p className="mt-3 max-w-[420px] text-sm leading-relaxed text-white/80">
              {analysis.strengths?.[0]?.title || 'Analise concluida com base no seu conteudo recente.'}
            </p>
            {!!summary?.growth && summary.growth.delta !== 0 && (
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold ${summary.growth.delta > 0 ? 'text-success' : 'text-danger'}`}>
                <TrendingUp className="h-3 w-3" />
                {summary.growth.delta >= 0 ? '+' : ''}{summary.growth.delta} seguidores no periodo
              </span>
            )}
          </div>
          <div className="relative shrink-0">
            <svg width="112" height="112" viewBox="0 0 96 96" className="-rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="#3A3A3C" strokeWidth="10" />
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ - (confianca.pct / 100) * circ} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold text-white">{confianca.pct}%</span>
              <span className={`text-[10px] font-semibold ${confianca.cor}`}>{confianca.texto.replace('Confianca ', '')}</span>
            </div>
          </div>
        </div>
      )}

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
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.56fr]">
            {/* O que merece atenção — prioridades reais, badge por posição */}
            <div className="rounded-[22px] border border-line bg-surface p-5 shadow-soft">
              <h2 className="text-base font-bold tracking-tight text-ink">O que merece atencao agora</h2>
              <p className="mt-0.5 text-[11px] text-muted">Ajustes com base na sua analise mais recente.</p>
              <div className="mt-4 space-y-2.5">
                {(analysis.attention?.length ? analysis.attention : analysis.priorities?.map((p) => ({ title: p, detail: '' })) || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3.5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{item.title}</p>
                      {item.detail && <p className="mt-0.5 truncate text-[11px] text-muted">{item.detail}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-[10px] font-bold text-accent">{PRIORIDADE_LABEL[i] || 'Media'}</span>
                  </div>
                ))}
                {!analysis.attention?.length && !analysis.priorities?.length && (
                  <p className="py-4 text-center text-xs text-muted">Nenhum ponto de atencao identificado.</p>
                )}
              </div>
            </div>

            {/* Pontos fortes — dado real */}
            <div className="rounded-[22px] border border-line bg-surface p-5 shadow-soft">
              <h2 className="text-base font-bold tracking-tight text-ink">Pontos fortes</h2>
              <p className="mt-0.5 text-[11px] text-muted">O que vale manter e repetir.</p>
              <div className="mt-4 space-y-4">
                {(analysis.strengths || []).map((item, i) => {
                  const Icon = FORCA_ICONS[i % FORCA_ICONS.length];
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-surface-2">
                        <Icon className="h-[15px] w-[15px] text-accent" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
                        <p className="truncate text-[10px] text-muted">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
                {!analysis.strengths?.length && (
                  <p className="py-4 text-center text-xs text-muted">Ainda sem pontos fortes identificados.</p>
                )}
              </div>
            </div>
          </div>

          {!!analysis.opportunities?.length && (
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 shadow-soft">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />
                Oportunidades
              </h3>
              <ul className="space-y-2">
                {analysis.opportunities.map((o, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{i + 1}</span>
                    <span>
                      <strong className="font-semibold">{o.title}</strong>
                      {o.detail && <span className="text-muted"> — {o.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
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
