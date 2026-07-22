'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Clock, FileText, ImagePlus, Link2, Rocket, Send, Trash2, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generatePost, finalizeNewsImage } from '@/lib/ai-actions';
import { publishNow, saveDraft, schedulePost, submitForApproval } from '@/lib/posts-actions';
import { assistantFormat, formatDetails, recommendationBrief } from '@/lib/assistant-content';
import { shouldShowPreviewTitle } from '@/lib/composer-preview';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Section, FieldLabel, InlineAlert, fieldClass } from './ComposerSection';

const FORMAT_LABEL = { post: 'Post', carousel: 'Carrossel', reel: 'Reel', stories: 'Story' };
const TITLE_POSITIONS = [
  { id: 'top', label: 'Topo' },
  { id: 'center', label: 'Centro' },
  { id: 'bottom', label: 'Base' }
];
const BUSY_LABEL = {
  upload: 'Enviando mídia',
  title: 'Aplicando título',
  publish: 'Publicando no Instagram',
  schedule: 'Agendando conteúdo',
  draft: 'Salvando rascunho',
  approval: 'Enviando para aprovação'
};

function nextDayValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function uploadMedia(brandId, file) {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${brandId}/assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export function AssistantContentEditor({ brandId, brandName, recommendation, onBack, onComplete }) {
  const brief = useMemo(() => recommendationBrief(recommendation), [recommendation]);
  const format = assistantFormat(recommendation?.contentPlan?.format);
  const [generated, setGenerated] = useState(null);
  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [title, setTitle] = useState('');
  const [titlePosition, setTitlePosition] = useState('bottom');
  const [titleAppliedByAi, setTitleAppliedByAi] = useState(false);
  const [media, setMedia] = useState([]);
  // Mesma lógica do Composer manual: o horário é um modo, não mais um quarto
  // botão com o mesmo peso dos outros três.
  const [mode, setMode] = useState('publish'); // 'publish' | 'schedule'
  const [scheduleDate, setScheduleDate] = useState(nextDayValue);
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalLink, setApprovalLink] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [completed, setCompleted] = useState('');

  async function createFirstVersion() {
    setBusy('generate'); setMessage(null);
    try {
      const result = await generatePost({ brandId, brandName, brief, composerContext: { recommendation }, recommendationId: recommendation?.id, generateImages: true });
      if (result?.error) throw new Error(result.error);
      setGenerated(result.spec);
      setCaption(result.spec.caption || '');
      setCta(result.spec.cta || '');
      setHashtags((result.spec.hashtags || []).join(' '));
      setTitle(result.spec.imageTitle || result.spec.headline || '');
      setTitlePosition(result.spec.imageTextPosition || 'bottom');
      setTitleAppliedByAi(Boolean(result.spec.imageText && result.imageProvider === 'pollinations'));
      setMedia(result.imageUrls || []);
    } catch (error) { setMessage({ type: 'err', text: error.message }); } finally { setBusy(''); }
  }

  async function addMedia(files) {
    setBusy('upload');
    try {
      const urls = await Promise.all(Array.from(files || []).map((file) => uploadMedia(brandId, file)));
      setMedia((current) => [...current, ...urls].slice(0, 10));
    } catch (error) { setMessage({ type: 'err', text: error.message }); } finally { setBusy(''); }
  }

  async function applyTitle() {
    if (!media[0]) return;
    setBusy('title');
    try {
      const result = await finalizeNewsImage({ brandId, sourceUrl: media[0], title, textEnabled: Boolean(title.trim()), position: titlePosition });
      if (result?.error) throw new Error(result.error);
      setMedia((items) => [result.imageUrl, ...items.slice(1)]);
      setMessage({ type: 'ok', text: 'Título aplicado à imagem.' });
    } catch (error) { setMessage({ type: 'err', text: error.message }); } finally { setBusy(''); }
  }

  async function action(kind) {
    if (!media.length && kind !== 'draft') return setMessage({ type: 'err', text: 'Adicione uma mídia antes de continuar.' });
    const scheduledAt = `${scheduleDate}T${scheduleTime}`;
    if (kind === 'schedule' && (!scheduleDate || !scheduleTime)) return setMessage({ type: 'err', text: 'Escolha uma data e um horário.' });
    setBusy(kind); setMessage(null);
    try {
      const payload = { brandId, caption: [caption, cta].filter(Boolean).join('\n\n'), hashtags, imageUrls: media, format: format === 'post' ? 'image' : format, recommendationId: recommendation?.id, recommendation, approvalNotes };
      const result = kind === 'draft' ? await saveDraft(payload)
        : kind === 'approval' ? await submitForApproval(payload)
          : kind === 'schedule' ? await schedulePost({ ...payload, scheduledAt: new Date(scheduledAt).toISOString() })
            : await publishNow(payload);
      if (result?.error) throw new Error(result.error);
      if (kind === 'approval' && result.token) setApprovalLink(`${window.location.origin}/approve/${result.token}`);
      if (kind === 'publish' || kind === 'schedule') {
        setCompleted(kind);
        onComplete?.(kind);
      } else setMessage({ type: 'ok', text: kind === 'draft' ? 'Rascunho salvo.' : 'Conteúdo enviado para aprovação.' });
    } catch (error) { setMessage({ type: 'err', text: error.message }); } finally { setBusy(''); }
  }

  if (busy === 'generate') {
    return (
      <Card as="section" className="max-w-2xl p-6">
        <LoadingIndicator label="Criando seu conteúdo" description="Estamos escrevendo e montando a primeira imagem." />
      </Card>
    );
  }

  if (completed) {
    return (
      <Card as="section" className="max-w-2xl border-success/30 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success"><Rocket className="h-7 w-7" aria-hidden="true" /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-success">Missão concluída</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
          {completed === 'publish' ? 'Seu conteúdo já está no ar' : 'Seu conteúdo foi agendado'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          {completed === 'publish'
            ? 'Você pode acompanhar o resultado ou iniciar uma nova ideia quando quiser.'
            : `Programado para ${new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}.`}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="/calendar" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-bold text-white shadow-md shadow-accent/25 transition-all hover:bg-accent/90">Ver calendário</a>
          <Button variant="outline" onClick={onBack}>Criar outra ideia</Button>
        </div>
      </Card>
    );
  }

  if (!generated) {
    return (
      <Card as="section" className="max-w-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">Conteúdo recomendado</p>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink">Vamos preparar a primeira versão</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Você revisa o texto e a imagem antes de decidir o que fazer.</p>
        <dl className="mt-5 grid gap-x-6 gap-y-2 rounded-xl border border-line bg-surface-2/60 p-4 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted">Formato</dt>
          <dd className="text-ink">{brief.format}</dd>
          <dt className="text-xs font-bold uppercase tracking-wide text-muted">Tema</dt>
          <dd className="text-ink">{brief.topic}</dd>
        </dl>
        <Button onClick={createFirstVersion} disabled={!!busy} className="mt-5">
          <Wand2 className="h-4 w-4" aria-hidden="true" /> Criar primeira versão
        </Button>
        {message && <p className="mt-3 text-sm font-semibold text-danger">{message.text}</p>}
      </Card>
    );
  }

  const details = formatDetails(generated, format);
  const busyLabel = BUSY_LABEL[busy];
  const segment = (active) =>
    `flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
      active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="grid max-w-[1120px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Primeira versão pronta</p>
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Revise antes de publicar</h2>
          </div>
          <button type="button" onClick={onBack} className="cursor-pointer text-sm font-bold text-accent transition-colors duration-200 hover:underline">Voltar</button>
        </div>

        {busyLabel && <Card className="p-3"><LoadingIndicator compact label={busyLabel} /></Card>}

        <Section step="1" title="Arte" hint="A imagem do post e o texto sobreposto nela.">
          <div className="mb-5 flex flex-wrap gap-2">
            {media.map((url, index) => (
              <div key={`${url}-${index}`} className="group relative">
                <img src={url} alt={`Mídia ${index + 1} do conteúdo`} className="h-20 w-20 rounded-lg border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => setMedia((items) => items.filter((_, i) => i !== index))}
                  aria-label={`Remover mídia ${index + 1}`}
                  className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ink text-app opacity-0 shadow-soft transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-line-strong bg-surface-2/60 text-muted transition-colors duration-200 focus-within:border-accent hover:border-accent/60 hover:text-accent">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Adicionar mídia</span>
              <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => addMedia(event.target.files)} />
            </label>
          </div>

          <FieldLabel htmlFor="assistant-title">Título visual</FieldLabel>
          <input id="assistant-title" value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Posição</span>
            <div role="group" aria-label="Posição do título na imagem" className="inline-flex gap-0.5 rounded-lg bg-surface-2 p-0.5">
              {TITLE_POSITIONS.map(({ id, label }) => (
                <button key={id} type="button" aria-pressed={titlePosition === id} onClick={() => setTitlePosition(id)} className={segment(titlePosition === id)}>
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={applyTitle}
              disabled={!media[0] || !!busy || titleAppliedByAi}
              className="cursor-pointer text-xs font-bold text-accent transition-colors duration-200 hover:underline disabled:cursor-not-allowed disabled:text-faint disabled:no-underline"
            >
              {titleAppliedByAi ? 'Título já aplicado pela IA' : 'Aplicar à imagem'}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {generated.imageText
              ? 'A IA recomendou texto nesta imagem para comunicar a ideia mais rápido.'
              : 'A IA recomendou manter a imagem limpa, sem texto sobreposto.'}
          </p>
        </Section>

        <Section
          step="2"
          title="Texto do post"
          hint="Legenda, chamada para ação e hashtags."
          aside={<span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{FORMAT_LABEL[format]}</span>}
        >
          <FieldLabel htmlFor="assistant-caption">Legenda</FieldLabel>
          <textarea id="assistant-caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={5} className={`${fieldClass} resize-y leading-relaxed`} />

          <div className="mt-4">
            <FieldLabel htmlFor="assistant-cta">Chamada para ação</FieldLabel>
            <input id="assistant-cta" value={cta} onChange={(event) => setCta(event.target.value)} className={fieldClass} />
          </div>

          <div className="mt-4">
            <FieldLabel htmlFor="assistant-hashtags">Hashtags</FieldLabel>
            <input id="assistant-hashtags" value={hashtags} onChange={(event) => setHashtags(event.target.value)} className={fieldClass} />
          </div>

          {/* O roteiro ocupava a coluna inteira antes de o usuário precisar
              dele. Fica recolhido, a um clique. */}
          <details className="group mt-5 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-ink">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
              Estrutura sugerida pela IA
            </summary>
            <div className="mt-3"><FormatDetails details={details} /></div>
          </details>
        </Section>

        <Section
          step="3"
          title="Publicação"
          hint="Escolha quando sai e confirme a ação."
          aside={
            <div role="group" aria-label="Quando publicar" className="inline-flex shrink-0 gap-0.5 rounded-lg bg-surface-2 p-0.5">
              <button type="button" aria-pressed={mode === 'publish'} onClick={() => setMode('publish')} className={segment(mode === 'publish')}>
                <Send className="h-3.5 w-3.5" aria-hidden="true" /> Agora
              </button>
              <button type="button" aria-pressed={mode === 'schedule'} onClick={() => setMode('schedule')} className={segment(mode === 'schedule')}>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Agendar
              </button>
            </div>
          }
        >
          {mode === 'schedule' && (
            <div className="mb-4 rounded-xl border border-line bg-surface-2/50 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-ink">
                <CalendarDays className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                Data e horário <span className="font-normal text-faint">· fuso de São Paulo</span>
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="assistant-date">Data</FieldLabel>
                  <input id="assistant-date" type="date" value={scheduleDate} min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setScheduleDate(event.target.value)} className={`${fieldClass} font-mono tabular-nums`} />
                </div>
                <div>
                  <FieldLabel htmlFor="assistant-time">Horário</FieldLabel>
                  <input id="assistant-time" type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)}
                    className={`${fieldClass} font-mono tabular-nums`} />
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="mb-4">
              <InlineAlert type={message.type}>
                {message.type === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                <span className="min-w-0">{message.text}</span>
              </InlineAlert>
            </div>
          )}
          {approvalLink && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
              <Link2 className="ml-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <input readOnly value={approvalLink} aria-label="Link de aprovação" className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-muted outline-none" />
              <a href={approvalLink} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-bold text-white">Abrir</a>
            </div>
          )}

          <Button onClick={() => action(mode)} disabled={!!busy} className="w-full">
            {mode === 'publish'
              ? <><Send className="h-4 w-4" aria-hidden="true" /> {busy === 'publish' ? 'Publicando…' : 'Publicar agora no Instagram'}</>
              : <><Clock className="h-4 w-4" aria-hidden="true" /> {busy === 'schedule' ? 'Agendando…' : 'Agendar publicação'}</>}
          </Button>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Ou</span>
            <Button size="sm" variant="outline" onClick={() => action('approval')} disabled={!!busy}>
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> {busy === 'approval' ? 'Enviando…' : 'Enviar p/ aprovação'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => action('draft')} disabled={!!busy}>
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {busy === 'draft' ? 'Salvando…' : 'Salvar rascunho'}
            </Button>
          </div>

          <details className="group mt-4 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-ink">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
              Observações para quem aprova
              <span className="font-normal text-faint">opcional</span>
            </summary>
            <textarea
              value={approvalNotes}
              onChange={(event) => setApprovalNotes(event.target.value)}
              rows={2}
              aria-label="Observações para quem aprova"
              placeholder="Ex.: confirme a oferta antes de publicar"
              className={`${fieldClass} mt-3`}
            />
          </details>
        </Section>
      </div>

      <Preview
        brandName={brandName}
        format={format}
        title={title}
        titlePosition={titlePosition}
        titleAppliedByAi={titleAppliedByAi}
        caption={caption}
        cta={cta}
        hashtags={hashtags}
        media={media}
      />
    </div>
  );
}

function FormatDetails({ details }) {
  if (details.kind === 'post') {
    return <p className="text-xs leading-relaxed text-ink"><strong className="text-muted">Direção visual:</strong> {details.artDirection}</p>;
  }
  if (details.kind === 'carousel') {
    return (
      <ol className="space-y-2.5">
        {details.pages.map((page, index) => (
          <li key={index} className="flex gap-2.5 text-xs leading-relaxed text-ink">
            <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface font-mono text-[10px] font-bold tabular-nums text-muted">{index + 1}</span>
            <span><strong>{page.title}</strong> — {page.text}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (details.kind === 'reel') {
    return (
      <div className="space-y-2 text-xs leading-relaxed text-ink">
        <p><strong className="text-muted">Gancho:</strong> {details.hook}</p>
        <pre className="whitespace-pre-wrap font-sans">{details.script}</pre>
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {details.stories.map((story, index) => (
        <li key={index} className="flex gap-2.5 text-xs leading-relaxed text-ink">
          <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface font-mono text-[10px] font-bold tabular-nums text-muted">{index + 1}</span>
          <span>{story.text}</span>
        </li>
      ))}
    </ol>
  );
}

function Preview({ brandName, format, title, titlePosition, titleAppliedByAi, caption, cta, hashtags, media }) {
  const positionClass = titlePosition === 'top' ? 'items-start' : titlePosition === 'center' ? 'items-center' : 'items-end';
  const showTitle = shouldShowPreviewTitle({ title, titleAppliedByAi });
  const body = [caption, cta].filter(Boolean).join('\n\n');
  return (
    <aside className="lg:sticky lg:top-6">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Prévia</p>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{FORMAT_LABEL[format]}</span>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 p-3">
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-accent-soft" aria-hidden="true" />
          <span className="text-xs font-bold text-ink">{brandName}</span>
        </div>
        <div className={`relative flex aspect-square bg-surface-2 p-5 ${positionClass}`}>
          {media[0] && <img src={media[0]} alt="Prévia do conteúdo" className="absolute inset-0 h-full w-full object-cover" />}
          {showTitle && <p className="relative max-w-full text-xl font-extrabold leading-tight text-white drop-shadow-lg">{title}</p>}
        </div>
        <p className="whitespace-pre-wrap p-3 text-xs leading-relaxed text-ink">
          <strong>{brandName}</strong> {body}
          {hashtags && <span className="text-accent"> {hashtags}</span>}
        </p>
      </Card>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-faint">
        Simulação aproximada. O corte final é do Instagram.
      </p>
    </aside>
  );
}
