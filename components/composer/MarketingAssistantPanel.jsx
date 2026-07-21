'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CheckCircle2, CircleDashed, Instagram, Play, Sparkles } from 'lucide-react';
import { chartDataForEvidence, detailsHrefForRecommendation, formatInsightValue, formatVariation } from '@/lib/marketing-insight';

const ANALYSIS_STEPS = [
  'Brand DNA',
  'Estratégia',
  'Métricas do Instagram',
  'Histórico de publicações',
  'Calendário de conteúdo'
];

function EvidenceChart({ evidence }) {
  const chartData = chartDataForEvidence(evidence);
  if (!chartData.length) {
    return <div className="mt-5 rounded-xl border border-dashed border-line bg-surface p-4 text-sm text-muted">Ainda não há uma comparação anterior suficiente para esta métrica.</div>;
  }
  const highestValue = Math.max(...chartData.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-4" aria-label={`Gráfico de ${evidence.metric}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-ink"><BarChart3 className="h-4 w-4 text-accent" />Comparação do período</div>
      <div className="mt-4 space-y-4" role="img" aria-label={`${evidence.metric}: período anterior ${formatInsightValue(evidence.previousValue, evidence.metric)}; período atual ${formatInsightValue(evidence.currentValue, evidence.metric)}`}>
        {chartData.map((item, index) => {
          const width = Math.max((Math.abs(item.value) / highestValue) * 100, item.value ? 4 : 0);
          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-muted">{item.label}</span>
                <strong className="text-ink">{formatInsightValue(item.value, evidence.metric)}</strong>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${index === 1 ? 'bg-accent' : 'bg-muted/50'}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Período: {evidence.period} · Fonte: {evidence.source}</p>
    </div>
  );
}

export function MarketingAssistantPanel({ hasApprovedDna, instagramConnected, recommendation, onCreateContent }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  useEffect(() => {
    if (!hasApprovedDna || !analysisStarted) return undefined;
    setVisibleSteps(0);
    const timer = window.setInterval(() => {
      setVisibleSteps((current) => {
        if (current >= ANALYSIS_STEPS.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 350);
    return () => window.clearInterval(timer);
  }, [hasApprovedDna, analysisStarted]);

  if (!hasApprovedDna) {
    return (
      <section className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-accent"><Sparkles className="h-5 w-5" /></div>
        <h2 className="mt-4 text-lg font-extrabold text-ink">Conclua o Brand DNA para receber recomendações</h2>
        <p className="mt-2 text-sm leading-6 text-muted">O Assistente de Marketing usa as informações aprovadas da sua marca para indicar a próxima ação com mais contexto.</p>
        <Link href="/brand-kit" className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-md shadow-accent/25 transition-all hover:bg-accent/90">Concluir Brand DNA</Link>
      </section>
    );
  }

  const analysisComplete = visibleSteps >= ANALYSIS_STEPS.length;
  const evidence = recommendation?.evidence?.[0];
  const variation = formatVariation(evidence?.variation);

  return (
    <section className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-soft" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-accent"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h2 className="text-lg font-extrabold text-ink">{analysisComplete ? 'Sua próxima ação está pronta' : analysisStarted ? 'Analisando sua marca...' : 'Pronto para analisar sua marca'}</h2>
          <p className="text-sm text-muted">{analysisComplete ? 'Usamos o contexto disponível para sugerir o melhor próximo passo.' : analysisStarted ? 'Estamos preparando a melhor próxima ação para você.' : 'Clique para reunir seus dados e encontrar a próxima melhor ação.'}</p>
        </div>
      </div>

      {!analysisStarted && <button type="button" onClick={() => setAnalysisStarted(true)} className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-white shadow-md shadow-accent/25 transition-all hover:bg-accent/90"><Play className="h-4 w-4" />Analisar agora</button>}

      {analysisStarted && <ul className="mt-6 space-y-3" aria-label="Etapas da análise da marca">
        {ANALYSIS_STEPS.map((step, index) => {
          const complete = index < visibleSteps;
          return <li key={step} className="flex items-center gap-2.5 text-sm text-ink">{complete ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleDashed className="h-4 w-4 animate-spin text-muted" />}{step}</li>;
        })}
      </ul>}

      {!instagramConnected && <div className="mt-6 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink"><Instagram className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p>Sua recomendação será mais limitada enquanto o Instagram não estiver conectado. <Link href="/connections" className="font-bold text-accent hover:underline">Conectar Instagram</Link></p></div>}

      {analysisComplete && recommendation && (
        <div className="mt-6 rounded-xl border border-line bg-surface-2 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">Prioridade de hoje</p>
          <h3 className="mt-2 text-base font-extrabold text-ink">{recommendation.title}</h3>
          <p className="mt-3 text-sm leading-6 text-ink">{recommendation.finding}</p>

          {evidence && <>
            <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
              <div><dt className="text-xs text-muted">{evidence.metric}</dt><dd className="mt-1 text-xl font-extrabold text-ink">{formatInsightValue(evidence.currentValue, evidence.metric)}</dd></div>
              <div><dt className="text-xs text-muted">Comparação</dt><dd className={`mt-1 text-sm font-bold ${Number(evidence.variation) < 0 ? 'text-danger' : Number(evidence.variation) > 0 ? 'text-success' : 'text-ink'}`}>{variation ? `${variation} em relação ao período anterior` : 'Ainda sem comparação anterior'}</dd></div>
              <div><dt className="text-xs text-muted">Período</dt><dd className="mt-1 text-sm font-semibold text-ink">{evidence.period}</dd></div>
              <div><dt className="text-xs text-muted">Fonte</dt><dd className="mt-1 text-sm font-semibold text-ink">{evidence.source}</dd></div>
            </dl>
            <EvidenceChart evidence={evidence} />
          </>}

          <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-muted">O que isso significa</p><p className="mt-1 text-sm leading-6 text-ink">{recommendation.meaning}</p></div>
          <div className="mt-5 rounded-xl bg-surface p-4 text-sm leading-6 text-ink"><p className="text-xs font-bold uppercase tracking-wide text-accent">Nossa recomendação</p><p className="mt-1">{recommendation.recommendation}</p></div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={onCreateContent} className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-md shadow-accent/25 transition-all hover:bg-accent/90">Criar este conteúdo</button>
            <Link href={detailsHrefForRecommendation(recommendation)} className="text-sm font-bold text-accent hover:underline">Ver detalhes da análise</Link>
          </div>
          <p className="mt-4 text-xs text-muted">Confiança {recommendation.confidence === 'high' ? 'alta' : recommendation.confidence === 'medium' ? 'média' : 'baixa'} · Origem: {evidence?.source || 'dados disponíveis'}</p>
        </div>
      )}

      {analysisComplete && !recommendation && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink">
          Não conseguimos montar uma recomendação agora. Atualize a página para tentar novamente; seus dados não foram alterados.
        </div>
      )}
    </section>
  );
}
