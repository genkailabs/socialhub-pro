'use client';
import { useState } from 'react';
import {
  ImagePlus, Send, Clock, CheckCircle2, AlertCircle, X, Hash, Smile,
  FileText, Link2, Copy, Check, ChevronLeft, ChevronRight, Heart, MessageCircle, Bookmark
} from 'lucide-react';
import { ComposerTypeSelector } from './ComposerTypeSelector';
import { StoryComposer } from './StoryComposer';
import { ReelComposer } from './ReelComposer';
import { DynamicPreview } from './DynamicPreview';
import { createClient } from '@/lib/supabase/client';
import { publishNow, schedulePost, saveDraft, submitForApproval } from '@/lib/posts-actions';
import { composeCaption, normalizeHashtags, IG_CAROUSEL_MAX, IG_CAPTION_MAX, uploadTempMedia } from '@/lib/posts-media';
import { Button } from '@/components/ui/Button';

const EMOJIS = ['🔥', '🚀', '✨', '💡', '🎉', '❤️', '👏', '📈', '✅', '👀', '💬', '🙌'];

async function uploadImage(brandId, file) {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${brandId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export function ComposerForm({ brandId, brandName = 'sua_marca' }) {
  const [format, setFormat] = useState('image');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [media, setMedia] = useState([]); // { file, url }
  const [slide, setSlide] = useState(0);
  const [cover, setCover] = useState(null);
  const [mode, setMode] = useState('now'); // 'now' | 'schedule'
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState('');    // qual ação está rodando
  const [msg, setMsg] = useState(null);
  const [approvalLink, setApprovalLink] = useState('');
  const [copied, setCopied] = useState(false);

  const tags = normalizeHashtags(hashtags);
  const composedLen = composeCaption(caption, hashtags).length;

  function handleFormatChange(newFormat) {
    if (newFormat !== 'reel') {
      setCover(null);
    }
    
    if (newFormat === 'image') {
      if (media.some(m => m.isVideo) || media.length > 1) {
        setMedia(cur => cur.filter(m => !m.isVideo).slice(0, 1));
        setSlide(0);
      }
    } else if (newFormat === 'carousel') {
      if (media.some(m => m.isVideo)) {
        setMedia(cur => cur.filter(m => !m.isVideo));
        setSlide(0);
      }
    } else if (newFormat === 'stories') {
      if (media.length > 1) {
        setMedia([media[0]]);
        setSlide(0);
      }
    } else if (newFormat === 'reel') {
      setMedia(cur => cur.filter(m => m.isVideo).slice(0, 1));
      setSlide(0);
    }
    setFormat(newFormat);
  }

  function addFiles(list) {
    const incoming = Array.from(list || []);
    if (format === 'image' && (media.length + incoming.length) > 1) {
      setFormat('carousel');
    }
    setMedia((cur) => {
      const isStories = format === 'stories';
      const room = isStories ? 1 - cur.length : IG_CAROUSEL_MAX - cur.length;
      if (room <= 0 && !isStories) return cur;
      
      const next = incoming.slice(0, Math.max(0, isStories ? 1 : room)).map((file) => ({ 
        file, 
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/')
      }));
      return isStories ? next : [...cur, ...next];
    });
    setMsg(null);
  }
  function removeAt(i) {
    if (format === 'carousel' && (media.length - 1) <= 1) {
      setFormat('image');
    }
    setMedia((cur) => cur.filter((_, idx) => idx !== i));
    setSlide(0);
  }
  function insertEmoji(e) { setCaption((c) => c + e); }

  async function run(action) {
    if (media.length === 0 && action !== 'draft') { setMsg({ type: 'err', text: 'Envie ao menos uma imagem.' }); return; }
    if (media.length > IG_CAROUSEL_MAX) { setMsg({ type: 'err', text: `Máximo ${IG_CAROUSEL_MAX} imagens no carrossel.` }); return; }
    if (action === 'schedule' && !when) { setMsg({ type: 'err', text: 'Escolha data e hora.' }); return; }

    setBusy(action); setMsg(null); setApprovalLink('');
    try {
      const supabase = createClient();
      let coverUrl = null;

      const imageUrls = await Promise.all(media.map(async (m) => {
        if (!m.file) return m.url;
        if (format === 'stories' || format === 'reel') {
          const res = await uploadTempMedia(supabase, brandId, m.file);
          return res.publicUrl;
        } else {
          return await uploadImage(brandId, m.file);
        }
      }));

      if (format === 'reel' && cover?.file) {
        const res = await uploadTempMedia(supabase, brandId, cover.file);
        coverUrl = res.publicUrl;
      }

      const payload = { brandId, caption, hashtags, imageUrls, ...(coverUrl && { coverUrl }) };
      let res;
      if (action === 'now') res = await publishNow({ ...payload, firstComment });
      else if (action === 'schedule') res = await schedulePost({ ...payload, scheduledAt: new Date(when).toISOString() });
      else if (action === 'draft') res = await saveDraft(payload);
      else if (action === 'approval') res = await submitForApproval(payload);
      if (res?.error) throw new Error(res.error);

      if (action === 'approval' && res.token) {
        setApprovalLink(`${window.location.origin}/approve/${res.token}`);
        setMsg({ type: 'ok', text: 'Enviado para aprovação! Copie o link para o cliente.' });
      } else if (res?.warning) {
        setMsg({ type: 'warn', text: res.warning });
      } else {
        const done = { now: 'Publicado no Instagram!', schedule: 'Post agendado!', draft: 'Rascunho salvo!' }[action];
        setMsg({ type: 'ok', text: done });
      }
      if (action !== 'approval') { setCaption(''); setHashtags(''); setFirstComment(''); setMedia([]); setWhen(''); setSlide(0); setCover(null); }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy('');
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  const field = 'w-full rounded-xl glass px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';
  const tab = (active) => `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'}`;
  const view = media[slide] || media[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* editor */}
      <div className="space-y-4">
        {/* formato */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">Formato</label>
          <ComposerTypeSelector value={format} onChange={handleFormatChange} />
        </div>

        {/* legenda */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-bold text-ink">Legenda</label>
            <span className={`text-[11px] ${composedLen > IG_CAPTION_MAX ? 'text-danger' : 'text-faint'}`}>{composedLen}/{IG_CAPTION_MAX}</span>
          </div>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
            placeholder="Escreva a legenda do post…" className={field} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => insertEmoji(e)}
                className="grid h-7 w-7 place-items-center rounded-md text-sm transition-colors hover:bg-surface-2" title={`Inserir ${e}`}>{e}</button>
            ))}
          </div>
        </div>

        {/* hashtags */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-ink"><Hash className="h-3.5 w-3.5" /> Hashtags</label>
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="marketing, social, dicas" className={field} />
          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((t) => <span key={t} className="rounded-md bg-accent-tint px-1.5 py-0.5 text-[11px] font-semibold text-accent">{t}</span>)}
            </div>
          )}
        </div>

        {/* imagens */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink">
            {format === 'stories' ? 'Mídia do Story' : format === 'reel' ? 'Mídia do Reel' : 'Imagens'}
            {format !== 'stories' && format !== 'reel' && <span className="font-normal text-faint"> · 1 imagem ou carrossel (2–{IG_CAROUSEL_MAX})</span>}
          </label>
          {format === 'stories' ? (
            <StoryComposer media={media} onAddFiles={addFiles} onRemove={() => { setMedia([]); setSlide(0); }} />
          ) : format === 'reel' ? (
            <ReelComposer 
              media={media} 
              cover={cover} 
              onAddMedia={addFiles} 
              onRemoveMedia={() => { setMedia([]); setSlide(0); setCover(null); }} 
              onAddCover={(file) => setCover({ file, url: URL.createObjectURL(file) })} 
              onRemoveCover={() => setCover(null)} 
            />
          ) : (
            <>
              {media.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {media.map((m, i) => (
                    <div key={i} className="group relative">
                      <img src={m.url} alt="" onClick={() => setSlide(i)}
                        className={`h-16 w-16 cursor-pointer rounded-lg border-2 object-cover transition-all ${i === slide ? 'border-accent' : 'border-line'}`} />
                      <button type="button" onClick={() => removeAt(i)}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-app opacity-0 transition-opacity group-hover:opacity-100"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              {media.length < IG_CAROUSEL_MAX && (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-center transition-colors hover:border-accent/50 hover:bg-accent-tint/40">
                  <ImagePlus className="h-5 w-5 text-muted" />
                  <span className="text-xs font-semibold text-ink">Clique para enviar {media.length > 0 ? 'mais imagens' : 'imagens'}</span>
                  <span className="text-[11px] text-faint">PNG, JPG · enviadas ao Storage do Supabase</span>
                  <input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />
                </label>
              )}
            </>
          )}
        </div>

        {/* primeiro comentário */}
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-ink"><MessageCircle className="h-3.5 w-3.5" /> Primeiro comentário <span className="font-normal text-faint">· ótimo p/ hashtags (só ao publicar agora)</span></label>
          <input value={firstComment} onChange={(e) => setFirstComment(e.target.value)} placeholder="Comentário automático logo após publicar…" className={field} />
        </div>

        {/* timing */}
        <div className="inline-flex w-full gap-1 rounded-xl bg-surface-2 p-1">
          <button type="button" onClick={() => setMode('now')} className={tab(mode === 'now')}><Send className="h-3.5 w-3.5" /> Publicar agora</button>
          <button type="button" onClick={() => setMode('schedule')} className={tab(mode === 'schedule')}><Clock className="h-3.5 w-3.5" /> Agendar</button>
        </div>
        {mode === 'schedule' && (
          <div className="animate-rise">
            <label className="mb-1.5 block text-xs font-bold text-ink">Data e hora</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          </div>
        )}

        {/* mensagem + link de aprovação */}
        {msg && (
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : msg.type === 'warn' ? 'text-warning' : 'text-danger'}`}>
            {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}
          </p>
        )}
        {approvalLink && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
            <Link2 className="ml-1 h-4 w-4 shrink-0 text-accent" />
            <input readOnly value={approvalLink} className="min-w-0 flex-1 bg-transparent text-[11px] text-muted outline-none" />
            <button onClick={copyLink} className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
        )}

        {/* ações */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button onClick={() => run(mode)} disabled={!!busy}>
            {busy === mode ? 'Processando…' : mode === 'now' ? 'Publicar agora no Instagram' : 'Agendar publicação'}
          </Button>
          <Button variant="outline" onClick={() => run('approval')} disabled={!!busy}>
            <Link2 className="h-4 w-4" /> {busy === 'approval' ? 'Enviando…' : 'Enviar p/ aprovação'}
          </Button>
          <Button variant="ghost" onClick={() => run('draft')} disabled={!!busy}>
            <FileText className="h-4 w-4" /> {busy === 'draft' ? 'Salvando…' : 'Rascunho'}
          </Button>
        </div>
      </div>

      {/* prévia estilo Instagram */}
      <div className="lg:sticky lg:top-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Prévia interativa</p>
        <DynamicPreview
          format={format}
          media={media}
          slide={slide}
          onSlideChange={setSlide}
          caption={caption}
          brandName={brandName}
          cover={cover}
        />
      </div>
    </div>
  );
}
