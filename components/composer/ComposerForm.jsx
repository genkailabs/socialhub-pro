'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ImagePlus, Send, Clock, CheckCircle2, AlertCircle, X, Hash, Smile,
  FileText, Link2, Copy, Check, ChevronRight, MessageCircle
} from 'lucide-react';
import { ComposerTypeSelector } from './ComposerTypeSelector';
import { StoryComposer } from './StoryComposer';
import { ReelComposer } from './ReelComposer';
import { DynamicPreview } from './DynamicPreview';
import { Section, FieldLabel, InlineAlert, fieldClass, dropzoneClass } from './ComposerSection';
import { createClient } from '@/lib/supabase/client';
import { publishNow, schedulePost, saveDraft, submitForApproval } from '@/lib/posts-actions';
import { composeCaption, normalizeHashtags, IG_CAROUSEL_MAX, IG_CAPTION_MAX, uploadTempMedia } from '@/lib/posts-media';
import { Button } from '@/components/ui/Button';

const EMOJIS = ['🔥', '🚀', '✨', '💡', '🎉', '❤️', '👏', '📈', '✅', '👀', '💬', '🙌'];

const FORMAT_LABEL = { image: 'Post', carousel: 'Carrossel', stories: 'Story', reel: 'Reel' };
// A dica muda com o formato: os avisos de limite deixam de ficar espalhados em
// labels soltas e passam a viver no cabeçalho da própria seção.
const MEDIA_HINT = {
  image: `Uma imagem quadrada. Se enviar mais de uma, viramos carrossel automaticamente (até ${IG_CAROUSEL_MAX}).`,
  carousel: `De 2 a ${IG_CAROUSEL_MAX} imagens. Clique numa miniatura para ver na prévia.`,
  stories: 'Uma foto ou vídeo vertical. Sai do ar em 24h.',
  reel: 'Um vídeo vertical, com capa opcional.'
};

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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const emojiRef = useRef(null);

  const tags = normalizeHashtags(hashtags);
  const composedLen = composeCaption(caption, hashtags).length;
  const overLimit = composedLen > IG_CAPTION_MAX;
  const isVertical = format === 'stories' || format === 'reel';

  useEffect(() => {
    if (!emojiOpen) return undefined;
    function onDocClick(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) setEmojiOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setEmojiOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [emojiOpen]);

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
  function insertEmoji(e) { setCaption((c) => c + e); setEmojiOpen(false); }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) addFiles(files);
  }

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

      const payload = { brandId, caption, hashtags, imageUrls, format, ...(coverUrl && { coverUrl }) };
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

  // Segmento compacto de horário: largura própria (não ocupa a linha inteira),
  // para não ser lido como a barra de ações principal.
  const timeTab = (active) =>
    `flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
      active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'
    }`;

  // Largura travada: no shell de 1500px os campos esticavam para ~1100px e a
  // legenda virava uma linha longa demais para ler (65–75 caracteres é o alvo).
  return (
    <div className="grid max-w-[1120px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* editor */}
      <div className="min-w-0 space-y-4">
        <Section step="1" title="Formato e mídia" hint={MEDIA_HINT[format]}>
          <ComposerTypeSelector value={format} onChange={handleFormatChange} />

          <div className="mt-5">
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
                  <div className="mb-3 flex flex-wrap gap-2">
                    {media.map((m, i) => (
                      <div key={i} className="group relative">
                        <img src={m.url} alt={`Imagem ${i + 1}`} onClick={() => setSlide(i)}
                          className={`h-16 w-16 cursor-pointer rounded-lg border-2 object-cover transition-colors duration-200 ${i === slide ? 'border-accent' : 'border-line hover:border-line-strong'}`} />
                        <button type="button" onClick={() => removeAt(i)} aria-label={`Remover imagem ${i + 1}`}
                          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-ink text-app opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {media.length < IG_CAROUSEL_MAX && (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`${dropzoneClass} ${dragging ? 'border-accent bg-accent-tint/50' : ''}`}
                  >
                    <ImagePlus className="h-5 w-5 text-muted" aria-hidden="true" />
                    <span className="text-xs font-bold text-ink">
                      Arraste aqui ou clique para enviar {media.length > 0 ? 'mais imagens' : 'imagens'}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-faint">PNG ou JPG · {media.length}/{IG_CAROUSEL_MAX}</span>
                    <input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />
                  </label>
                )}
              </>
            )}
          </div>
        </Section>

        <Section
          step="2"
          title="Texto do post"
          hint="Legenda, hashtags e o comentário automático."
          aside={
            <span className={`shrink-0 font-mono text-[11px] tabular-nums ${overLimit ? 'font-bold text-danger' : 'text-faint'}`}>
              {composedLen}/{IG_CAPTION_MAX}
            </span>
          }
        >
          <FieldLabel htmlFor="composer-caption">Legenda</FieldLabel>
          <textarea
            id="composer-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="Escreva a legenda do post…"
            className={`${fieldClass} resize-y leading-relaxed ${overLimit ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
          />

          {/* Os 12 emojis viviam soltos numa fileira sob o textarea; agora abrem
              em popover para não competir com os campos. */}
          <div className="relative mt-2 inline-block" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              aria-expanded={emojiOpen}
              aria-label="Inserir emoji na legenda"
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-muted transition-colors duration-200 hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Smile className="h-3.5 w-3.5" aria-hidden="true" /> Emoji
            </button>
            {emojiOpen && (
              <div className="absolute left-0 top-full z-20 mt-1.5 grid w-max grid-cols-6 gap-0.5 rounded-xl border border-line bg-surface p-2 shadow-lift">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => insertEmoji(e)} aria-label={`Inserir ${e}`}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-base transition-colors duration-200 hover:bg-surface-2">{e}</button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5">
            <FieldLabel htmlFor="composer-hashtags">
              <Hash className="h-3.5 w-3.5" aria-hidden="true" /> Hashtags
            </FieldLabel>
            <input
              id="composer-hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="marketing, social, dicas"
              className={fieldClass}
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t} className="rounded-md bg-accent-tint px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">{t}</span>
                ))}
              </div>
            )}
          </div>

          <details className="group mt-5 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-ink">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
              <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              Primeiro comentário
              <span className="font-normal text-faint">opcional</span>
            </summary>
            <div className="mt-3">
              <input
                id="composer-first-comment"
                value={firstComment}
                onChange={(e) => setFirstComment(e.target.value)}
                placeholder="Comentário automático logo após publicar…"
                className={fieldClass}
              />
              <p className="mt-2 text-[11px] text-faint">Bom lugar para as hashtags. Só vale ao publicar agora.</p>
            </div>
          </details>
        </Section>

        <Section
          step="3"
          title="Publicação"
          hint="Escolha quando sai e confirme a ação."
          aside={
            <div role="group" aria-label="Quando publicar" className="inline-flex shrink-0 gap-0.5 rounded-lg bg-surface-2 p-0.5">
              <button type="button" aria-pressed={mode === 'now'} onClick={() => setMode('now')} className={timeTab(mode === 'now')}>
                <Send className="h-3.5 w-3.5" aria-hidden="true" /> Agora
              </button>
              <button type="button" aria-pressed={mode === 'schedule'} onClick={() => setMode('schedule')} className={timeTab(mode === 'schedule')}>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Agendar
              </button>
            </div>
          }
        >
          {mode === 'schedule' && (
            <div className="mb-4">
              <FieldLabel htmlFor="composer-when">Data e hora</FieldLabel>
              <input id="composer-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
                className={`${fieldClass} font-mono tabular-nums sm:max-w-xs`} />
            </div>
          )}

          {msg && (
            <div className="mb-4">
              <InlineAlert type={msg.type}>
                {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span className="min-w-0">{msg.text}</span>
              </InlineAlert>
            </div>
          )}
          {approvalLink && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
              <Link2 className="ml-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <input readOnly value={approvalLink} aria-label="Link de aprovação" className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-muted outline-none" />
              <button onClick={copyLink} aria-label="Copiar link de aprovação"
                className="shrink-0 cursor-pointer rounded-lg bg-accent px-2.5 py-1.5 text-white transition-colors duration-200 hover:bg-accent/90">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <Button onClick={() => run(mode)} disabled={!!busy} className="w-full">
            {busy === mode
              ? 'Processando…'
              : mode === 'now'
                ? <><Send className="h-4 w-4" aria-hidden="true" /> Publicar agora no Instagram</>
                : <><Clock className="h-4 w-4" aria-hidden="true" /> Agendar publicação</>}
          </Button>

          {/* Ações secundárias em outro peso e tamanho: antes as três tinham a
              mesma presença e o usuário não sabia qual era a principal. */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Ou</span>
            <Button size="sm" variant="outline" onClick={() => run('approval')} disabled={!!busy}>
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> {busy === 'approval' ? 'Enviando…' : 'Enviar p/ aprovação'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run('draft')} disabled={!!busy}>
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {busy === 'draft' ? 'Salvando…' : 'Salvar rascunho'}
            </Button>
          </div>
        </Section>
      </div>

      {/* prévia estilo Instagram */}
      <aside className="lg:sticky lg:top-6">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Prévia</p>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{FORMAT_LABEL[format]}</span>
        </div>
        {/* 9:16 em coluna de 340px vira um paredão preto: limitamos a largura
            para o mock ficar do tamanho de um celular. */}
        <div className={isVertical ? 'mx-auto max-w-[240px]' : ''}>
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
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-faint">
          Simulação aproximada. O corte final é do Instagram.
        </p>
      </aside>
    </div>
  );
}
