'use client';

import { useState } from 'react';
import {
  Send, Clock, CheckCircle2, AlertCircle, Link2, Copy, Check,
  FileText, AlertTriangle
} from 'lucide-react';
import { ComposerTypeSelector } from './ComposerTypeSelector';
import { PostForm } from './PostForm';
import { CarouselForm } from './CarouselForm';
import { StoryForm } from './StoryForm';
import { ReelComposer } from './ReelComposer';
import { DynamicPreview } from './DynamicPreview';
import { Section, FieldLabel, InlineAlert, fieldClass } from './ComposerSection';
import { createClient } from '@/lib/supabase/client';
import { publishNow, schedulePost, saveDraft, submitForApproval } from '@/lib/posts-actions';
import { IG_CAROUSEL_MAX, uploadTempMedia } from '@/lib/posts-media';
import { Button } from '@/components/ui/Button';

const FORMAT_LABEL = { image: 'Post', carousel: 'Carrossel', stories: 'Story', reel: 'Reel' };

const MEDIA_HINT = {
  image: 'Post no Feed com exatamente 1 imagem (1:1, 4:5 ou 1.91:1).',
  carousel: `Carrossel no Feed com 2 a ${IG_CAROUSEL_MAX} imagens e ordem reordenável.`,
  stories: 'Story vertical 9:16 com editor visual sobreposto. Expira em 24h.',
  reel: 'Reel vertical 9:16 em vídeo, com capa opcional e compartilhamento no Feed.'
};

async function processFiles(list) {
  const incoming = Array.from(list || []);
  if (!incoming.length) return [];

  return await Promise.all(
    incoming.map(async (file) => {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      let width = 0, height = 0, aspectRatioRatio = 1, aspectRatio = '1:1';

      if (!isVideo) {
        await new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            width = img.width;
            height = img.height;
            aspectRatioRatio = width / height;
            if (Math.abs(aspectRatioRatio - 1) < 0.1) aspectRatio = '1:1';
            else if (aspectRatioRatio < 0.9) aspectRatio = '4:5';
            else if (aspectRatioRatio > 1.3) aspectRatio = '1.91:1';
            else aspectRatio = '1:1';
            resolve();
          };
          img.onerror = resolve;
          img.src = url;
        });
      } else {
        await new Promise((resolve) => {
          const video = document.createElement('video');
          video.onloadedmetadata = () => {
            width = video.videoWidth;
            height = video.videoHeight;
            aspectRatioRatio = width / height;
            if (aspectRatioRatio < 0.7) aspectRatio = '9:16';
            else if (Math.abs(aspectRatioRatio - 1) < 0.1) aspectRatio = '1:1';
            else aspectRatio = '16:9';
            resolve();
          };
          video.onerror = resolve;
          video.src = url;
        });
      }
      return { file, url, isVideo, width, height, aspectRatioRatio, aspectRatio };
    })
  );
}

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
  const [altText, setAltText] = useState('');
  const [media, setMedia] = useState([]); // { file, url, isVideo, aspectRatio, ... }
  const [slide, setSlide] = useState(0);
  const [cover, setCover] = useState(null); // { file, url }
  const [coverType, setCoverType] = useState('custom'); // 'custom' | 'frame'
  const [coverOffsetSec, setCoverOffsetSec] = useState(0);
  const [shareToFeed, setShareToFeed] = useState(true);
  const [storyOverlay, setStoryOverlay] = useState({
    text: '', align: 'center', size: 'md', vertical: 'center', horizontal: 'center', ctaText: '', ctaUrl: ''
  });

  const [mode, setMode] = useState('now'); // 'now' | 'schedule'
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [approvalLink, setApprovalLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Estado para Modal de Confirmação de Troca de Formato
  const [pendingConfirmation, setPendingConfirmation] = useState(null); // { targetFormat: string, lossReasons: string[], incomingFiles: File[] | null }

  const isVertical = format === 'stories' || format === 'reel';

  // Verificar incompatibilidades e sugerir confirmação antes de trocar formato
  function checkAndSetFormat(targetFormat, incomingFiles = null) {
    if (targetFormat === format && !incomingFiles) return;

    const lossReasons = [];

    // 1. Perda de múltiplas mídias se sair de Carrossel p/ Post/Story/Reel
    if (format === 'carousel' && media.length > 1 && targetFormat !== 'carousel') {
      lossReasons.push(`O novo formato aceita apenas 1 mídia. As outras ${media.length - 1} imagens serão removidas.`);
    }

    // 2. Perda de textos se mudar para Story (não possui legenda de feed)
    if (targetFormat === 'stories' && (caption.trim() || hashtags.trim() || firstComment.trim() || altText.trim())) {
      lossReasons.push('Stories não possuem legenda pública de feed, hashtags, comentário inicial ou alt text. Esses campos não serão exibidos.');
    }

    // 3. Perda de overlay de Story ao sair de Story
    if (format === 'stories' && (storyOverlay.text.trim() || storyOverlay.ctaText.trim() || storyOverlay.ctaUrl.trim()) && targetFormat !== 'stories') {
      lossReasons.push('O texto sobreposto (Overlay) e o CTA visuais exclusivos de Story serão removidos.');
    }

    // 4. Perda de vídeo ao mudar p/ Post ou Carrossel
    if ((targetFormat === 'image' || targetFormat === 'carousel') && media.some(m => m.isVideo)) {
      lossReasons.push('O vídeo atual não é suportado pelo formato Post ou Carrossel e será removido.');
    }

    // 5. Perda de capa de Reel ao sair de Reel
    if (format === 'reel' && cover && targetFormat !== 'reel') {
      lossReasons.push('A imagem de capa personalizada do Reel será removida.');
    }

    if (lossReasons.length > 0) {
      setPendingConfirmation({ targetFormat, lossReasons, incomingFiles });
    } else {
      applyFormatChange(targetFormat, incomingFiles);
    }
  }

  function confirmFormatChange() {
    if (!pendingConfirmation) return;
    const { targetFormat, incomingFiles } = pendingConfirmation;
    applyFormatChange(targetFormat, incomingFiles);
    setPendingConfirmation(null);
  }

  async function applyFormatChange(targetFormat, incomingFiles = null) {
    if (targetFormat !== 'reel') {
      setCover(null);
    }

    if (targetFormat === 'image') {
      setMedia(cur => cur.filter(m => !m.isVideo).slice(0, 1));
      setSlide(0);
    } else if (targetFormat === 'carousel') {
      setMedia(cur => cur.filter(m => !m.isVideo));
      setSlide(0);
    } else if (targetFormat === 'stories') {
      setMedia(cur => cur.slice(0, 1));
      setSlide(0);
    } else if (targetFormat === 'reel') {
      setMedia(cur => cur.filter(m => m.isVideo).slice(0, 1));
      setSlide(0);
    }

    setFormat(targetFormat);

    if (incomingFiles && incomingFiles.length > 0) {
      const processed = await processFiles(incomingFiles);
      setMedia(cur => {
        if (targetFormat === 'image' || targetFormat === 'stories' || targetFormat === 'reel') {
          return processed.slice(0, 1);
        } else {
          return [...cur, ...processed].slice(0, IG_CAROUSEL_MAX);
        }
      });
      setSlide(0);
    }
  }

  async function addMediaFiles(list) {
    const processed = await processFiles(list);
    if (!processed.length) return;

    setMedia(cur => {
      if (format === 'image' || format === 'stories' || format === 'reel') {
        return processed.slice(0, 1);
      } else {
        const room = IG_CAROUSEL_MAX - cur.length;
        if (room <= 0) return cur;
        return [...cur, ...processed.slice(0, room)];
      }
    });
    setMsg(null);
  }

  function removeMediaAt(index) {
    setMedia(cur => cur.filter((_, i) => i !== index));
    setSlide(curSlide => (curSlide >= index && curSlide > 0 ? curSlide - 1 : 0));
  }

  function reorderMedia(fromIdx, toIdx) {
    setMedia(cur => {
      if (fromIdx < 0 || fromIdx >= cur.length || toIdx < 0 || toIdx >= cur.length) return cur;
      const next = [...cur];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
    setSlide(toIdx);
  }

  async function replaceMediaAt(index, newFile) {
    const [processed] = await processFiles([newFile]);
    if (!processed) return;
    setMedia(cur => cur.map((item, i) => (i === index ? processed : item)));
  }

  async function run(action) {
    if (media.length === 0 && action !== 'draft') {
      setMsg({ type: 'err', text: 'Envie ao menos um arquivo de mídia.' });
      return;
    }
    if (format === 'carousel' && media.length < 2 && action !== 'draft') {
      setMsg({ type: 'err', text: 'O formato Carrossel requer no mínimo 2 imagens.' });
      return;
    }
    if (action === 'schedule' && !when) {
      setMsg({ type: 'err', text: 'Escolha data e hora para agendar.' });
      return;
    }

    setBusy(action);
    setMsg(null);
    setApprovalLink('');

    try {
      const supabase = createClient();
      let coverUrl = null;

      const imageUrls = await Promise.all(
        media.map(async (m) => {
          if (!m.file) return m.url;
          if (format === 'stories' || format === 'reel') {
            const res = await uploadTempMedia(supabase, brandId, m.file);
            return res.publicUrl;
          } else {
            return await uploadImage(brandId, m.file);
          }
        })
      );

      if (format === 'reel' && cover?.file && coverType === 'custom') {
        const res = await uploadTempMedia(supabase, brandId, cover.file);
        coverUrl = res.publicUrl;
      }

      const payload = {
        brandId,
        caption,
        hashtags,
        firstComment,
        altText,
        imageUrls,
        format,
        ...(coverUrl && { coverUrl }),
        ...(format === 'reel' && { shareToFeed, coverType, coverOffsetSec }),
        ...(format === 'stories' && { storyOverlay })
      };

      let res;
      if (action === 'now') res = await publishNow(payload);
      else if (action === 'schedule') res = await schedulePost({ ...payload, scheduledAt: new Date(when).toISOString() });
      else if (action === 'draft') res = await saveDraft(payload);
      else if (action === 'approval') res = await submitForApproval(payload);

      if (res?.error) throw new Error(res.error);

      if (action === 'approval' && res.token) {
        setApprovalLink(`${window.location.origin}/approve/${res.token}`);
        setMsg({ type: 'ok', text: 'Enviado para aprovação! Copie o link abaixo para o cliente.' });
      } else if (res?.warning) {
        setMsg({ type: 'warn', text: res.warning });
      } else {
        const done = { now: 'Publicado no Instagram!', schedule: 'Post agendado com sucesso!', draft: 'Rascunho salvo!' }[action];
        setMsg({ type: 'ok', text: done });
      }

      if (action !== 'approval') {
        setCaption('');
        setHashtags('');
        setFirstComment('');
        setAltText('');
        setMedia([]);
        setWhen('');
        setSlide(0);
        setCover(null);
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy('');
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const timeTab = (active) =>
    `flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${
      active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'
    }`;

  return (
    <div className="relative">
      {/* Modal Elegante de Confirmação de Troca de Formato */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Alterar para formato {FORMAT_LABEL[pendingConfirmation.targetFormat]}?</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Deseja continuar com a alteração do formato? Confira os ajustes que serão feitos automaticamente:
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning space-y-2">
              <p className="font-bold">Atenção aos seguintes pontos:</p>
              <ul className="list-disc pl-4 space-y-1.5 font-medium leading-relaxed">
                {pendingConfirmation.lossReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingConfirmation(null)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={confirmFormatChange}
                className="bg-accent text-white hover:bg-accent/90 font-bold"
              >
                Trocar formato
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Principal e Prévias */}
      <div className="grid max-w-[1120px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Lado do Formulário */}
        <div className="min-w-0 space-y-4">
          <Section step="1" title="Selecione o Formato" hint={MEDIA_HINT[format]}>
            <ComposerTypeSelector value={format} onChange={(newFmt) => checkAndSetFormat(newFmt)} />
          </Section>

          {/* Renderização Adaptativa do Formulário de Mídia e Conteúdo por Formato */}
          {format === 'image' && (
            <PostForm
              media={media}
              onAddMedia={addMediaFiles}
              onRemoveMedia={removeMediaAt}
              caption={caption}
              onCaptionChange={setCaption}
              hashtags={hashtags}
              onHashtagsChange={setHashtags}
              firstComment={firstComment}
              onFirstCommentChange={setFirstComment}
              altText={altText}
              onAltTextChange={setAltText}
              onSuggestFormat={(suggestedFmt, files) => checkAndSetFormat(suggestedFmt, files)}
            />
          )}

          {format === 'carousel' && (
            <CarouselForm
              media={media}
              onAddMedia={addMediaFiles}
              onRemoveMedia={removeMediaAt}
              onReorderMedia={reorderMedia}
              onReplaceMedia={replaceMediaAt}
              slide={slide}
              onSlideChange={setSlide}
              caption={caption}
              onCaptionChange={setCaption}
              hashtags={hashtags}
              onHashtagsChange={setHashtags}
              firstComment={firstComment}
              onFirstCommentChange={setFirstComment}
            />
          )}

          {format === 'stories' && (
            <StoryForm
              media={media}
              onAddMedia={addMediaFiles}
              onRemoveMedia={removeMediaAt}
              storyOverlay={storyOverlay}
              onStoryOverlayChange={setStoryOverlay}
            />
          )}

          {format === 'reel' && (
            <ReelComposer
              media={media}
              cover={cover}
              onAddMedia={addMediaFiles}
              onRemoveMedia={() => { setMedia([]); setSlide(0); setCover(null); }}
              onAddCover={(file) => setCover({ file, url: URL.createObjectURL(file) })}
              onRemoveCover={() => setCover(null)}
              coverType={coverType}
              onCoverTypeChange={setCoverType}
              coverOffsetSec={coverOffsetSec}
              onCoverOffsetSecChange={setCoverOffsetSec}
              shareToFeed={shareToFeed}
              onShareToFeedChange={setShareToFeed}
              caption={caption}
              onCaptionChange={setCaption}
              hashtags={hashtags}
              onHashtagsChange={setHashtags}
              firstComment={firstComment}
              onFirstCommentChange={setFirstComment}
            />
          )}

          {/* Seção 3: Publicação */}
          <Section
            step="3"
            title="Publicação e Agendamento"
            hint="Escolha quando publicar sua criação no Instagram e confirme."
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
                <input
                  id="composer-when"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className={`${fieldClass} font-mono tabular-nums sm:max-w-xs`}
                />
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
                <button
                  onClick={copyLink}
                  aria-label="Copiar link de aprovação"
                  className="shrink-0 cursor-pointer rounded-lg bg-accent px-2.5 py-1.5 text-white transition-colors duration-200 hover:bg-accent/90"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}

            <Button onClick={() => run(mode)} disabled={!!busy} className="w-full font-bold">
              {busy === mode
                ? 'Processando…'
                : mode === 'now'
                  ? <><Send className="h-4 w-4" aria-hidden="true" /> Publicar agora no Instagram</>
                  : <><Clock className="h-4 w-4" aria-hidden="true" /> Agendar publicação</>}
            </Button>

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

        {/* Prévia Adaptativa em Tempo Real */}
        <aside className="lg:sticky lg:top-6">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Prévia em Tempo Real</p>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{FORMAT_LABEL[format]}</span>
          </div>
          <div className={isVertical ? 'mx-auto max-w-[260px]' : ''}>
            <DynamicPreview
              format={format}
              media={media}
              slide={slide}
              onSlideChange={setSlide}
              caption={caption}
              hashtags={hashtags}
              brandName={brandName}
              cover={cover}
              altText={altText}
              storyOverlay={storyOverlay}
              shareToFeed={shareToFeed}
            />
          </div>
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-faint">
            Simulação aproximada adaptativa. O corte final é processado pelo Instagram.
          </p>
        </aside>
      </div>
    </div>
  );
}
