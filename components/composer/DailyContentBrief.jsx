'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, ExternalLink, Image as ImageIcon, Pencil, Sparkles } from 'lucide-react';
import { approveDailyContent, prepareDailyContent, scheduleDailyContent } from '@/lib/daily-content-actions';
import { dailyPackageToComposerDraft } from '@/lib/daily-content-composer';

export { dailyPackageToComposerDraft } from '@/lib/daily-content-composer';

const CAPTION_PREVIEW_LIMIT = 320;

function asText(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(' ');
  return typeof value === 'string' ? value.trim() : '';
}

function scheduleLabel(value) {
  if (!value || typeof value !== 'object') return 'Horário recomendado não disponível.';
  const weekday = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][Number(value.weekday)];
  const time = asText(value.time);
  return weekday && time ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} às ${time}` : 'Horário recomendado não disponível.';
}

function sourceLabel(source) {
  const publisher = asText(source?.publisher || source?.provenance || source?.source);
  const title = asText(source?.title || source?.name || source?.url);
  return publisher && title ? `${publisher} — ${title}` : title || publisher || 'Fonte verificada';
}

function unavailableCopy(pkg, unavailableMessage) {
  if (unavailableMessage) return unavailableMessage;
  if (pkg?.status === 'failed') return pkg.failure_message || 'A preparação não pôde ser concluída com evidências verificadas.';
  if (pkg?.status === 'draft') return 'O conteúdo está sendo preparado. Aguarde a validação das evidências.';
  return 'Ainda não há um pacote preparado para hoje. O Hub só prepara conteúdo quando há contexto aprovado e evidência suficiente.';
}

function internalEvidenceLabel(evidence) {
  if (!evidence || evidence.kind !== 'internal') return null;
  return reasonExplanation(evidence.source || 'approved-context');
}

function reasonExplanation(reason) {
  const explanations = {
    'approved-calendar': 'faz parte do calendário editorial aprovado para esta semana.',
    'contextual-opportunity': 'equilibra a estratégia aprovada com o contexto da marca e os conteúdos recentes.',
    'approved-context': 'foi selecionado a partir do contexto editorial aprovado da marca.',
    'approved-strategy-and-brand-dna': 'combina a estratégia aprovada com o DNA da marca.'
  };
  const value = asText(reason);
  const looksLikeInternalCode = /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(value);
  return explanations[value]
    || (looksLikeInternalCode ? 'foi selecionado a partir do contexto aprovado da marca.' : value)
    || 'foi selecionado a partir do contexto aprovado da marca.';
}

export function DailyContentBrief({ brandId, contentDate, package: initialPackage = null, unavailableMessage = '' }) {
  const [pkg, setPkg] = useState(initialPackage);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [captionExpanded, setCaptionExpanded] = useState(false);

  useEffect(() => {
    setPkg(initialPackage);
    setError('');
    setCaptionExpanded(false);
  }, [initialPackage, unavailableMessage]);

  const ready = pkg?.status === 'ready';
  const approved = pkg?.status === 'approved';
  const scheduled = pkg?.status === 'scheduled';
  const generated = pkg?.generated_content && typeof pkg.generated_content === 'object' ? pkg.generated_content : {};
  const caption = asText(generated.caption || generated.legenda);
  const hasLongCaption = caption.length > CAPTION_PREVIEW_LIMIT;
  const visibleCaption = hasLongCaption && !captionExpanded
    ? `${caption.slice(0, CAPTION_PREVIEW_LIMIT).trimEnd()}…`
    : caption;
  const hashtags = asText(generated.hashtags);
  const sources = useMemo(() => Array.isArray(pkg?.sources) ? pkg.sources.filter((source) => source?.url) : [], [pkg]);
  const internalEvidence = internalEvidenceLabel(pkg?.evidence);
  const reason = reasonExplanation(pkg?.reason);
  const composerCompatible = Boolean(dailyPackageToComposerDraft(pkg));

  async function prepare() {
    setBusy('prepare');
    setError('');
    try {
      const result = await prepareDailyContent({ brandId, contentDate });
      if (!result?.ok || !result.package) throw new Error(result?.error || 'A preparação não devolveu um pacote utilizável.');
      setPkg(result.package);
    } catch (actionError) {
      setError(actionError?.message || 'Não foi possível preparar o conteúdo agora.');
    } finally {
      setBusy('');
    }
  }

  async function approve() {
    if (!ready) return;
    setBusy('approve');
    setError('');
    try {
      const result = await approveDailyContent({ packageId: pkg.id });
      if (!result?.ok || !result.package) throw new Error(result?.error || 'A aprovação não pôde ser concluída.');
      setPkg(result.package);
    } catch (actionError) {
      setError(actionError?.message || 'Não foi possível aprovar o pacote.');
    } finally {
      setBusy('');
    }
  }

  async function schedule() {
    const date = scheduledAt ? new Date(scheduledAt) : null;
    if (!approved || !date || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      setError('Informe uma data futura para agendar este conteúdo.');
      return;
    }
    setBusy('schedule');
    setError('');
    try {
      const result = await scheduleDailyContent({ packageId: pkg.id, scheduledAt: date.toISOString() });
      if (!result?.ok || !result.package) throw new Error(result?.error || 'O agendamento não pôde ser concluído.');
      setPkg(result.package);
    } catch (actionError) {
      setError(actionError?.message || 'Não foi possível agendar o pacote.');
    } finally {
      setBusy('');
    }
  }

  if (!ready && !approved && !scheduled) {
    return (
      <section aria-labelledby="daily-content-title" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-tint text-accent"><Sparkles className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Decisão editorial</p>
            <h1 id="daily-content-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink">Conteúdo de hoje</h1>
            <p role={pkg?.status === 'failed' || unavailableMessage ? 'alert' : undefined} className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{pkg?.status === 'failed' || unavailableMessage ? `O Hub não preparou este conteúdo: ${unavailableCopy(pkg, unavailableMessage)}` : unavailableCopy(pkg, unavailableMessage)}</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={prepare} disabled={busy === 'prepare'} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          <Sparkles className="h-4 w-4" />{busy === 'prepare' ? 'Preparando…' : 'Preparar conteúdo'}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="daily-content-title" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Decisão editorial · hoje</p>
          <h1 id="daily-content-title" className="mt-1 text-xl font-extrabold tracking-tight text-ink">Conteúdo de hoje</h1>
          <h2 className="mt-2 text-base font-bold text-ink">{pkg.topic}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{reason}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">O Hub selecionou este tema porque {reason}</p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-bold text-accent">{scheduled ? 'Agendado' : approved ? 'Aprovado' : 'Pronto para revisar'}</span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Legenda</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{visibleCaption || 'Legenda não disponível.'}</p>
            {hasLongCaption && <button type="button" aria-expanded={captionExpanded} onClick={() => setCaptionExpanded((value) => !value)} className="mt-2 text-sm font-bold text-accent underline-offset-2 hover:underline">{captionExpanded ? 'Mostrar resumo da legenda' : 'Ler legenda completa'}</button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Hashtags</p><p className="mt-1 text-sm text-ink">{hashtags || 'Não informado.'}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Texto alternativo</p><p className="mt-1 text-sm text-ink">{pkg.alt_text || 'Não informado.'}</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2"><CalendarClock className="h-4 w-4 text-accent" />{scheduleLabel(pkg.recommended_schedule)}</div>
          {sources.length > 0 && <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Fontes verificadas</p><ul className="mt-2 space-y-1.5">{sources.map((source) => <li key={source.url}><a className="inline-flex items-center gap-1 text-sm font-semibold text-accent underline-offset-2 hover:underline" href={source.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />{sourceLabel(source)}</a></li>)}</ul></div>}
          {internalEvidence && <div className="rounded-lg bg-surface-2 px-3 py-2"><p className="text-xs font-bold uppercase tracking-wide text-muted">Contexto aprovado</p><p className="mt-1 text-sm text-ink">{internalEvidence}</p></div>}
        </div>
        <figure className="overflow-hidden rounded-xl border border-line bg-surface-2">
          {pkg.media_urls?.[0] ? <img className="aspect-square h-auto w-full object-cover" src={pkg.media_urls[0]} alt={pkg.alt_text || 'Arte gerada para o conteúdo de hoje'} /> : <div className="grid aspect-square place-items-center text-muted"><ImageIcon className="h-8 w-8" /></div>}
          <figcaption className="px-3 py-2 text-xs font-semibold text-muted">Arte gerada por IA</figcaption>
        </figure>
      </div>

      {!composerCompatible && <p role="note" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{/reel|video/i.test(asText(pkg.format)) ? 'Reels precisam de um vídeo real. O Hub não transforma esta arte estática em um Reel falso.' : 'Esta arte diária não é compatível com o formato informado e não será carregada no Composer.'}</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {approved && <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" />Aprovado; escolha quando agendar.</p>}
      {scheduled && <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" />Agendado sem publicar agora.</p>}

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={approve} disabled={!ready || !composerCompatible || busy === 'approve'} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check className="h-4 w-4" />{busy === 'approve' ? 'Aprovando…' : 'Aprovar'}</button>
          {composerCompatible && <a href={`/composer?daily=${encodeURIComponent(pkg.id)}`} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-ink"><Pencil className="h-4 w-4" />Editar</a>}
        </div>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold text-muted sm:max-w-xs">Data e hora
          <input aria-label="Data e hora" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink" />
        </label>
        <button type="button" onClick={schedule} disabled={!approved || !composerCompatible || busy === 'schedule'} className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"><CalendarClock className="h-4 w-4" />{busy === 'schedule' ? 'Agendando…' : 'Agendar'}</button>
      </div>
    </section>
  );
}
