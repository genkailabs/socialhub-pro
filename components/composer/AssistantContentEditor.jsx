'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, ImagePlus, Link2, Rocket, Send, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { generatePost, finalizeNewsImage } from '@/lib/ai-actions';
import { publishNow, saveDraft, schedulePost, submitForApproval } from '@/lib/posts-actions';
import { assistantFormat, formatDetails, recommendationBrief } from '@/lib/assistant-content';
import { shouldShowPreviewTitle } from '@/lib/composer-preview';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

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
      const payload = { brandId, caption: [caption, cta].filter(Boolean).join('\n\n'), hashtags, imageUrls: media, format: recommendation?.contentPlan?.format || 'image', recommendationId: recommendation?.id, recommendation, approvalNotes };
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

  if (busy === 'generate') return <section className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-soft"><LoadingIndicator label="Criando seu conteúdo" description="Estamos escrevendo e montando a primeira imagem." /></section>;

  if (completed) return (
    <section className="max-w-2xl rounded-2xl border border-success/30 bg-surface p-8 text-center shadow-soft">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success"><Rocket className="h-7 w-7" /></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-wide text-success">Missão concluída</p>
      <h2 className="mt-2 text-2xl font-extrabold text-ink">{completed === 'publish' ? 'Seu conteúdo já está no ar' : 'Seu conteúdo foi agendado'}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{completed === 'publish' ? 'Em vez de voltar para o assistente, você pode acompanhar o resultado ou iniciar uma nova ideia quando quiser.' : `Programado para ${new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}.`}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><a href="/calendar" className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-bold text-white">Ver calendário</a><button type="button" onClick={onBack} className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-sm font-bold text-ink">Criar outra ideia</button></div>
    </section>
  );

  if (!generated) return <section className="max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-soft"><p className="text-xs font-bold uppercase tracking-wide text-accent">Conteúdo recomendado</p><h2 className="mt-2 text-xl font-extrabold text-ink">Vamos preparar a primeira versão</h2><p className="mt-2 text-sm leading-6 text-muted">Você revisa o texto e a imagem antes de decidir o que fazer.</p><div className="mt-5 rounded-xl bg-surface-2 p-4 text-sm text-ink"><strong>Formato:</strong> {brief.format}<br /><strong>Tema:</strong> {brief.topic}</div><button type="button" onClick={createFirstVersion} disabled={!!busy} className="mt-5 inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-bold text-white disabled:opacity-60">Criar primeira versão</button>{message && <p className="mt-3 text-sm text-danger">{message.text}</p>}</section>;

  const field = 'mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent';
  const details = formatDetails(generated, format);
  return <section className="grid gap-6 lg:grid-cols-[1fr_320px]"><div className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-accent">Primeira versão pronta</p><h2 className="text-xl font-extrabold text-ink">Revise antes de publicar</h2></div><button type="button" onClick={onBack} className="text-sm font-bold text-accent">Voltar</button></div>{busy && <div className="rounded-xl border border-line bg-surface p-3"><LoadingIndicator compact label={busy === 'upload' ? 'Enviando mídia' : busy === 'title' ? 'Aplicando título' : busy === 'publish' ? 'Publicando no Instagram' : busy === 'schedule' ? 'Agendando conteúdo' : 'Salvando'} /></div>}<EditorField label="Título visual" value={title} onChange={setTitle} field={field} /><div className="flex flex-wrap items-center gap-2">{['top', 'center', 'bottom'].map((position) => <button key={position} type="button" onClick={() => setTitlePosition(position)} className={`rounded-lg px-2 py-1 text-xs font-bold ${titlePosition === position ? 'bg-accent text-white' : 'bg-surface-2 text-muted'}`}>{position === 'top' ? 'Topo' : position === 'center' ? 'Centro' : 'Base'}</button>)}<button type="button" onClick={applyTitle} disabled={!media[0] || !!busy || titleAppliedByAi} className="text-xs font-bold text-accent">{titleAppliedByAi ? 'Título aplicado pela IA' : 'Aplicar à imagem'}</button></div><p className="text-xs text-muted">{generated.imageText ? 'A IA recomendou texto nesta imagem para comunicar a ideia mais rápido.' : 'A IA recomendou manter a imagem limpa, sem texto sobreposto.'}</p><EditorField label="Legenda" value={caption} onChange={setCaption} field={field} area /><EditorField label="CTA" value={cta} onChange={setCta} field={field} /><EditorField label="Hashtags" value={hashtags} onChange={setHashtags} field={field} /><FormatDetails details={details} /><div><label className="text-xs font-bold text-ink">Mídia</label><div className="mt-2 flex flex-wrap gap-2">{media.map((url, index) => <div key={`${url}-${index}`} className="relative"><img src={url} alt="Mídia do conteúdo" className="h-20 w-20 rounded-lg object-cover" /><button type="button" onClick={() => setMedia((items) => items.filter((_, i) => i !== index))} className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-white"><Trash2 className="h-3 w-3" /></button></div>)}<label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-muted"><ImagePlus className="h-5 w-5" /><input className="hidden" type="file" accept="image/*" multiple onChange={(event) => addMedia(event.target.files)} /></label></div></div><div className="rounded-2xl border border-line bg-surface-2 p-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" /><div><p className="text-sm font-extrabold text-ink">Calendário de agendamento</p><p className="text-xs text-muted">Escolha a data e a hora em São Paulo.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-ink">Data<input type="date" value={scheduleDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setScheduleDate(event.target.value)} className={field} /></label><label className="text-xs font-bold text-ink">Horário<input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} className={field} /></label></div></div><label className="block text-xs font-bold text-ink">Observações para aprovação<textarea value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} rows={2} className={field} placeholder="Ex.: confirme a oferta antes de publicar" /></label><div className="flex flex-wrap gap-2 border-t border-line pt-4"><Action label="Salvar rascunho" icon={FileText} onClick={() => action('draft')} busy={busy} /><Action label="Enviar para aprovação" icon={Link2} onClick={() => action('approval')} busy={busy} /><Action label="Agendar" icon={CalendarDays} onClick={() => action('schedule')} busy={busy} /><Action label="Publicar agora" icon={Send} onClick={() => action('publish')} busy={busy} primary /></div>{message && <p className={message.type === 'ok' ? 'text-sm text-success' : 'text-sm text-danger'}>{message.text}</p>}{approvalLink && <div className="rounded-lg bg-surface-2 p-3 text-xs text-ink">Link público de aprovação: <a className="font-bold text-accent underline" href={approvalLink} target="_blank">abrir e compartilhar</a></div>}</div><Preview brandName={brandName} title={title} titlePosition={titlePosition} titleAppliedByAi={titleAppliedByAi} caption={caption} hashtags={hashtags} media={media} /></section>;
}

function EditorField({ label, value, onChange, field, area = false }) { return <label className="block text-xs font-bold text-ink">{label}{area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className={field} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={field} />}</label>; }
function Action({ label, icon: Icon, onClick, busy, primary = false }) { return <button type="button" onClick={onClick} disabled={!!busy} className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold disabled:opacity-60 ${primary ? 'bg-accent text-white' : 'border border-line text-ink'}`}><Icon className="h-3.5 w-3.5" />{label}</button>; }
function FormatDetails({ details }) { if (details.kind === 'post') return <div className="rounded-xl bg-surface-2 p-3 text-sm"><strong>Direção visual:</strong> {details.artDirection}</div>; if (details.kind === 'carousel') return <div className="rounded-xl bg-surface-2 p-3 text-sm"><strong>Páginas do carrossel</strong>{details.pages.map((page, index) => <p key={index} className="mt-2"><b>{page.title}</b> — {page.text}</p>)}</div>; if (details.kind === 'reel') return <div className="rounded-xl bg-surface-2 p-3 text-sm"><strong>Gancho:</strong> {details.hook}<pre className="mt-2 whitespace-pre-wrap font-sans">{details.script}</pre></div>; return <div className="rounded-xl bg-surface-2 p-3 text-sm"><strong>Sequência de stories</strong>{details.stories.map((story, index) => <p key={index} className="mt-2">{index + 1}. {story.text}</p>)}</div>; }
function Preview({ brandName, title, titlePosition, titleAppliedByAi, caption, hashtags, media }) { const positionClass = titlePosition === 'top' ? 'items-start' : titlePosition === 'center' ? 'items-center' : 'items-end'; const showTitle = shouldShowPreviewTitle({ title, titleAppliedByAi }); return <aside className="lg:sticky lg:top-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Prévia</p><div className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="p-3 text-xs font-bold text-ink">{brandName}</div><div className={`relative flex aspect-square bg-surface-2 p-5 ${positionClass}`}>{media[0] && <img src={media[0]} alt="Prévia do conteúdo" className="absolute inset-0 h-full w-full object-cover" />}{showTitle && <p className="relative max-w-full text-xl font-extrabold text-white drop-shadow-lg">{title}</p>}</div><p className="whitespace-pre-wrap p-3 text-xs text-ink"><b>{brandName}</b> {caption}<span className="text-accent"> {hashtags}</span></p></div></aside>; }
