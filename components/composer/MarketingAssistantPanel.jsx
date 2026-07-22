'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CheckCircle2, CircleDashed, Instagram, Play, Sparkles } from 'lucide-react';
import { chartDataForEvidence, detailsHrefForRecommendation, formatInsightValue, formatVariation } from '@/lib/marketing-insight';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ANALYSIS_STEPS = [
  'Brand DNA',
  'Estratégia',
  'Métricas do Instagram',
  'Histórico de publicações',
  'Calendário de conteúdo'
];

const CONFIDENCE_LABEL = { high: 'alta', medium: 'média' };

function EvidenceChart({ evidence }) {
  const chartData = chartDataForEvidence(evidence);
  if (!chartData.length) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-line bg-surface-2/50 p-3 text-xs text-muted">
        Ainda não há uma comparação anterior suficiente para esta métrica.
      </p>
    );
  }
  const highestValue = Math.max(...chartData.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="mt-4" aria-label={`Gráfico de ${evidence.metric}`}>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        <BarChart3 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />Comparação do período
      </p>
      <div
        className="mt-3 space-y-3"
        role="img"
        aria-label={`${evidence.metric}: período anterior ${formatInsightValue(evidence.previousValue, evidence.metric)}; período atual ${formatInsightValue(evidence.currentValue, evidence.metric)}`}
      >
        {chartData.map((item, index) => {
          const width = Math.max((Math.abs(item.value) / highestValue) * 100, item.value ? 4 : 0);
          return (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-muted">{item.label}</span>
                <strong className="font-mono tabular-nums text-ink">{formatInsightValue(item.value, evidence.metric)}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${index === 1 ? 'bg-accent' : 'bg-muted/40'}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-faint">Período: {evidence.period} · Fonte: {evidence.source}</p>
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
      <Card as="section" className="max-w-2xl p-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-tint text-accent"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
        <h2 className="mt-4 text-lg font-extrabold tracking-tight text-ink">Conclua o Brand DNA para receber recomendações</h2>
        <p className="mt-2 text-sm leading-6 text-muted">O Assistente de Marketing usa as informações aprovadas da sua marca para indicar a próxima ação com mais contexto.</p>
        <Link href="/brand-kit" className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-bold text-white shadow-md shadow-accent/25 transition-all hover:bg-accent/90">Concluir Brand DNA</Link>
      </Card>
    );
  }

  const analysisComplete = visibleSteps >= ANALYSIS_STEPS.length;
  const evidence = recommendation?.evidence?.[0];
  const variation = formatVariation(evidence?.variation);

  return (
    <Card as="section" className="max-w-2xl p-6" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-tint text-accent"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight text-ink">
            {analysisComplete ? 'Sua próxima ação está pronta' : analysisStarted ? 'Analisando sua marca…' : 'Pronto para analisar sua marca'}
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted">
            {analysisComplete
              ? 'Usamos o contexto disponível para sugerir o melhor próximo passo.'
              : analysisStarted
                ? 'Estamos preparando a melhor próxima ação para você.'
                : 'Clique para reunir seus dados e encontrar a próxima melhor ação.'}
          </p>
        </div>
      </div>

      {!analysisStarted && (
        <Button onClick={() => setAnalysisStarted(true)} className="mt-6">
          <Play className="h-4 w-4" aria-hidden="true" />Analisar agora
        </Button>
      )}

      {analysisStarted && (
        <ul className="mt-6 space-y-2.5" aria-label="Etapas da análise da marca">
          {ANALYSIS_STEPS.map((step, index) => {
            const complete = index < visibleSteps;
            return (
              <li key={step} className={`flex items-center gap-2.5 text-sm transition-colors duration-200 ${complete ? 'text-ink' : 'text-muted'}`}>
                {complete
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  : <CircleDashed className="h-4 w-4 shrink-0 animate-spin text-muted" aria-hidden="true" />}
                {step}
              </li>
            );
          })}
        </ul>
      )}

      {!instagramConnected && (
        <div className="mt-6 flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs leading-relaxed text-ink">
          <Instagram className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p>Sua recomendação será mais limitada enquanto o Instagram não estiver conectado. <Link href="/connections" className="font-bold text-accent hover:underline">Conectar Instagram</Link></p>
        </div>
      )}

      {/* Antes: card dentro de card dentro de card. Agora um bloco só, com
          filetes separando as partes da leitura. */}
      {analysisComplete && recommendation && (
        <div className="mt-6 rounded-xl border border-line bg-surface-2/50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Prioridade de hoje</p>
          <h3 className="mt-1.5 text-base font-extrabold leading-tight tracking-tight text-ink">{recommendation.title}</h3>
          <p className="mt-2.5 text-sm leading-6 text-ink-2">{recommendation.finding}</p>

          {evidence && (
            <div className="mt-5 border-t border-line pt-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">{evidence.metric}</dt>
                  <dd className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-ink">{formatInsightValue(evidence.currentValue, evidence.metric)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">Comparação</dt>
                  <dd className={`mt-0.5 text-sm font-bold ${Number(evidence.variation) < 0 ? 'text-danger' : Number(evidence.variation) > 0 ? 'text-success' : 'text-ink'}`}>
                    {variation ? `${variation} vs. período anterior` : 'Ainda sem comparação anterior'}
                  </dd>
                </div>
              </dl>
              <EvidenceChart evidence={evidence} />
            </div>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">O que isso significa</p>
            <p className="mt-1 text-sm leading-6 text-ink-2">{recommendation.meaning}</p>
          </div>

          <div className="mt-4 rounded-xl border border-accent/25 bg-accent-tint/50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Nossa recomendação</p>
            <p className="mt-1 text-sm leading-6 text-ink">{recommendation.recommendation}</p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={onCreateContent}>Criar este conteúdo</Button>
            <Link href={detailsHrefForRecommendation(recommendation)} className="text-sm font-bold text-accent hover:underline">Ver detalhes da análise</Link>
          </div>
          <p className="mt-4 text-[11px] text-faint">
            Confiança {CONFIDENCE_LABEL[recommendation.confidence] || 'baixa'} · Origem: {evidence?.source || 'dados disponíveis'}
          </p>
        </div>
      )}

      {analysisComplete && !recommendation && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed text-ink">
          Não conseguimos montar uma recomendação agora. Atualize a página para tentar novamente; seus dados não foram alterados.
        </div>
      )}
    </Card>
  );
}
