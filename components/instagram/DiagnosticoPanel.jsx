'use client';
import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Lightbulb, RefreshCw, Sparkles, TrendingUp, Users, Radio } from 'lucide-react';
import { runInstagramAudit } from '@/lib/instagram-audit-actions';
import { DnaScoreRing } from '@/components/brand-kit/DnaScoreRing';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const CONFIANCA = {
  baixa: { pct: 34, nivel: 'Poucos dados', tone: 'warning' },
  media: { pct: 64, nivel: 'Razoável', tone: 'accent' },
  alta: { pct: 92, nivel: 'Muito boa', tone: 'accent' }
};

const FORCA_ICONS = [Users, Radio, Sparkles];

// Severidade por posição, como no handoff: o primeiro item é o mais urgente.
const SEVERIDADE = [
  { label: 'Alta', className: 'bg-danger/10 text-danger' },
  { label: 'Impacto', className: 'bg-accent-tint text-accent-ink' },
  { label: 'Média', className: 'bg-warning/15 text-warning-ink' }
];

const FORMAT_LABELS = { IMAGE: 'Imagem', VIDEO: 'Vídeo', CAROUSEL_ALBUM: 'Carrossel', REELS: 'Reel' };

function Kpi({ label, value, delta, deltaTone }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">{label}</p>
      <p className="mt-2.5 flex flex-wrap items-baseline gap-2">
        <span className="text-[26px] font-extrabold leading-none tabular-nums text-ink">{value}</span>
        {delta && (
          <span className={`text-[11.5px] font-semibold tabular-nums ${deltaTone === 'danger' ? 'text-danger' : 'text-success'}`}>
            {delta}
          </span>
        )}
      </p>
    </div>
  );
}

// Gráfico de 7 barras. Altura sai do número real de posts do dia — dia sem post
// fica no piso de 6px, sem estimativa.
function AtividadeSemana({ dias }) {
  const maxPosts = dias.reduce((max, d) => Math.max(max, d.posts), 0);
  const unidade = maxPosts > 4 ? 132 / maxPosts : 33;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">Atividade da semana</h2>
        <p className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />com interação</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-surface-3" aria-hidden="true" />sem interação</span>
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-2">
        {dias.map((d) => {
          const ativo = d.interactions > 0;
          const altura = Math.max(6, Math.round(d.posts * unidade));
          return (
            <div key={d.weekday} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className={`text-[11px] font-semibold tabular-nums ${ativo ? 'text-accent-ink' : 'text-faint'}`}>
                {d.posts || ''}
              </span>
              <div
                className={`w-full rounded-t-lg ${ativo ? 'bg-accent' : 'bg-surface-3'}`}
                style={{ height: `${altura}px` }}
                aria-hidden="true"
              />
              {/* Altura fixa no rodapé da coluna: o chip de horário só existe em
                  alguns dias e, sem reservar espaço, os rótulos saem de linha. */}
              <div className="flex h-[42px] flex-col items-center gap-1.5">
                <span className="text-[11px] text-muted">{DIAS_CURTOS[d.weekday]}</span>
                {ativo && d.peakHour !== null && (
                  <span className="rounded-full bg-accent-tint px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums text-accent-ink">
                    {d.peakHour}h
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
        Altura da barra = posts publicados no dia. Destacados em azul os dias que receberam interação.
      </p>
    </div>
  );
}

function FormatosPublicados({ formats }) {
  if (!formats?.length) return null;
  const unico = formats.length === 1;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-[15px] font-bold text-ink">Formatos publicados</h2>

      <div className="mt-4 flex h-[7px] gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
        {formats.map((f, i) => (
          <span
            key={f.format}
            className={i === 0 ? 'bg-accent' : i === 1 ? 'bg-accent-soft' : 'bg-surface-3'}
            style={{ width: `${f.share}%` }}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {formats.map((f) => (
          <li key={f.format} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-ink-2">{FORMAT_LABELS[f.format] || f.format}</span>
            <span className="font-semibold tabular-nums text-ink">{f.share}%</span>
          </li>
        ))}
      </ul>

      {unico && (
        <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
          Um único formato concentra tudo. Variar entre imagem, carrossel e Reel amplia o alcance.
        </p>
      )}
    </div>
  );
}

// Números que o código mediu, separados da leitura da IA de propósito. A
// mini-barra só aparece onde existe proporção real (participação de formato).
function NumerosDaAnalise({ summary }) {
  if (!summary) return null;
  const { frequency, formats, posts, growth, bestTimes } = summary;
  const medido = bestTimes?.[0]?.basis === 'channel';

  const linhas = [
    { label: 'Frequência', value: `${frequency.perWeek} por semana`, hint: `${frequency.total} posts em ${frequency.days} dias` },
    { label: 'Interações', value: `${posts.average} por post` },
    ...(formats || []).map((f) => ({
      label: FORMAT_LABELS[f.format] || f.format,
      value: `${f.share}%`,
      ratio: f.share / 100
    })),
    {
      label: 'Seguidores',
      value: growth
        ? `${growth.start} → ${growth.end}`
        : 'sem histórico suficiente',
      hint: growth ? `${growth.delta >= 0 ? '+' : ''}${growth.delta}${growth.pct === null ? '' : ` · ${growth.pct}%`}` : undefined
    },
    ...(bestTimes?.length
      ? [{
          label: 'Horários',
          value: bestTimes.map((t) => `${DIAS[t.weekday]} ${t.hour}h`).join(' · '),
          hint: medido ? 'medido neste perfil' : 'referência geral, não medida deste perfil'
        }]
      : [])
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-[15px] font-bold text-ink">Números por trás da análise</h2>
      <dl className="mt-4 space-y-3">
        {linhas.map((l, i) => (
          <div key={i} className="grid items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
            <dt className="text-[12.5px] text-muted">{l.label}</dt>
            {/* A mini-barra só entra onde existe proporção real; linha sem
                proporção fica vazia em vez de mostrar uma barra em zero. */}
            {l.ratio === undefined ? (
              <span className="hidden sm:block" />
            ) : (
              <div className="hidden h-[5px] rounded-full bg-surface-3 sm:block" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(l.ratio * 100)}%` }} />
              </div>
            )}
            <dd className="text-right text-[12.5px] font-semibold text-ink">
              {l.value}
              {l.hint && <span className="block text-[11px] font-normal text-faint">{l.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
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
  const username = summary?.profile?.username;

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
  const atencao = analysis?.attention?.length
    ? analysis.attention
    : analysis?.priorities?.map((p) => ({ title: p, detail: '' })) || [];

  return (
    <div className="space-y-4">
      {/* O título da página fica em app/(app)/instagram/diagnostico/page.jsx —
          aqui só o estado da análise e a ação, para não haver dois h1. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">
          {username && <span className="font-semibold text-ink-2">@{username} · </span>}
          {audit
            ? `Analisado em ${new Date(audit.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}`
            : 'Uma visão prática do que está funcionando e do que merece atenção.'}
        </p>
        <button
          type="button"
          onClick={analisar}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
          {busy ? 'Analisando...' : audit ? 'Atualizar análise' : 'Analisar meu Instagram'}
        </button>
      </div>

      {analysis && (
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)]">
          <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-line bg-surface p-6">
            <DnaScoreRing
              value={confianca.pct}
              max={100}
              tone={confianca.tone}
              label={`${confianca.pct}%`}
            />
            <div className="min-w-[130px] flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">Confiança da análise</p>
              <p className={`mt-1.5 text-[19px] font-extrabold leading-tight ${confianca.tone === 'warning' ? 'text-warning-ink' : 'text-ink'}`}>
                {confianca.nivel}
              </p>
              {!!summary?.growth && summary.growth.delta !== 0 && (
                <span className={`mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${summary.growth.delta > 0 ? 'text-success' : 'text-danger'}`}>
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {summary.growth.delta >= 0 ? '+' : ''}{summary.growth.delta} seguidores no período
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Posts no período" value={summary?.frequency?.total ?? '—'} />
            <Kpi label="Posts por semana" value={summary?.frequency?.perWeek ?? '—'} />
            <Kpi
              label="Seguidores"
              value={summary?.profile?.followers ?? '—'}
              delta={summary?.growth?.pct != null ? `${summary.growth.pct >= 0 ? '+' : ''}${summary.growth.pct}%` : null}
              deltaTone={summary?.growth?.pct >= 0 ? 'success' : 'danger'}
            />
            <Kpi label="Interações por post" value={summary?.posts?.average ?? '—'} />
          </div>
        </div>
      )}

      {msg && (
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'warn' ? 'text-warning-ink' : 'text-danger'}`}>
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{msg.text}
        </p>
      )}

      {/* O PRD proíbe a IA inventar métrica ausente; o usuário também merece
          saber por que o alcance não aparece. */}
      {!!unavailable.length && audit && (
        <p className="flex items-start gap-2 rounded-xl bg-accent-tint p-3.5 text-[12px] leading-relaxed text-accent-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            O Instagram não liberou {unavailable.join(', ')} para esta conta, então a análise não considerou esses dados.
            Uma conta profissional com permissão de estatísticas mostra mais.
          </span>
        </p>
      )}

      {summary?.lowData && audit && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-[12px] leading-relaxed text-warning-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Seu perfil ainda tem poucos posts, então esta leitura é um ponto de partida — não uma conclusão.</span>
        </p>
      )}

      {analysis && (
        <>
          {!!summary?.weekActivity?.length && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <AtividadeSemana dias={summary.weekActivity} />
              <FormatosPublicados formats={summary.formats} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-[15px] font-bold text-ink">Atenção agora</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Ajustes com base na sua análise mais recente.</p>
              <div className="mt-4 space-y-1">
                {atencao.map((item, i) => {
                  const sev = SEVERIDADE[i] || SEVERIDADE[2];
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-surface-2">
                      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg bg-surface-2 text-[13px] font-extrabold tabular-nums text-ink">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                        {item.detail && <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.detail}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] ${sev.className}`}>
                        {sev.label}
                      </span>
                    </div>
                  );
                })}
                {!atencao.length && (
                  <p className="py-4 text-center text-xs text-muted">Nenhum ponto de atenção identificado.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-[15px] font-bold text-ink">Pontos fortes</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">O que vale manter e repetir.</p>
              <div className="mt-4 space-y-3.5">
                {(analysis.strengths || []).map((item, i) => {
                  const Icon = FORCA_ICONS[i % FORCA_ICONS.length];
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-tint">
                        <Icon className="h-[15px] w-[15px] text-accent-ink" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{item.detail}</p>
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
            <div className="rounded-2xl bg-accent-tint p-5">
              <h3 className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-accent-ink">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                Oportunidade
              </h3>
              <ul className="mt-3 space-y-2.5">
                {analysis.opportunities.map((o, i) => (
                  <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">{i + 1}</span>
                    <span>
                      <strong className="font-semibold">{o.title}</strong>
                      {o.detail && <span className="text-ink-2"> — {o.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!analysis.openQuestions?.length && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-[15px] font-bold text-ink">O que ainda precisamos saber</h3>
              <ul className="mt-3 space-y-2">
                {analysis.openQuestions.map((q, i) => (
                  <li key={i} className="text-[12px] text-muted">— {q}</li>
                ))}
              </ul>
            </div>
          )}

          <NumerosDaAnalise summary={summary} />
        </>
      )}
    </div>
  );
}
