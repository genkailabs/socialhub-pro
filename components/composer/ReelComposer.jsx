'use client';

import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud, X, ImagePlus, AlertCircle, Video, Film, CheckSquare,
  Square, Sliders, Hash, Smile, ChevronRight, MessageCircle
} from 'lucide-react';
import { Section, FieldLabel, Note, InlineAlert, fieldClass, dropzoneClass } from './ComposerSection';
import { normalizeHashtags, composeCaption, IG_CAPTION_MAX } from '@/lib/posts-media';

const EMOJIS = ['🔥', '🚀', '✨', '💡', '🎉', '❤️', '👏', '📈', '✅', '👀', '💬', '🙌'];

export function ReelComposer({
  media = [],
  cover,
  onAddMedia,
  onRemoveMedia,
  onAddCover,
  onRemoveCover,
  coverType = 'custom',
  onCoverTypeChange,
  coverOffsetSec = 0,
  onCoverOffsetSecChange,
  shareToFeed = true,
  onShareToFeedChange,
  caption = '',
  onCaptionChange,
  hashtags = '',
  onHashtagsChange,
  firstComment = '',
  onFirstCommentChange
}) {
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(30);
  const [dragging, setDragging] = useState(false);
  const emojiRef = useRef(null);

  const tags = normalizeHashtags(hashtags);
  const composedLen = composeCaption(caption, hashtags).length;
  const overLimit = composedLen > IG_CAPTION_MAX;

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

  const hasVideo = media.length > 0 && media[0]?.isVideo;
  const videoFile = hasVideo ? media[0] : null;

  useEffect(() => {
    if (videoFile?.url) {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        if (vid.duration && !isNaN(vid.duration)) {
          setVideoDuration(Math.floor(vid.duration));
        }
      };
      vid.src = videoFile.url;
    }
  }, [videoFile?.url]);

  function handleVideoUpload(fileList) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Formato inválido. O Reel aceita exclusivamente vídeos MP4 ou MOV.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('O vídeo excede o limite máximo recomendado (200MB).');
      return;
    }

    setError('');
    onAddMedia([file]);
  }

  function handleCoverUpload(fileList) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('A capa do Reel deve ser uma imagem (JPG/PNG).');
      return;
    }

    setError('');
    onAddCover(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleVideoUpload(e.dataTransfer?.files);
  }

  return (
    <div className="space-y-4">
      <Section
        step="1"
        title="Vídeo do Reel (9:16)"
        hint="Envie exatamente 1 arquivo de vídeo no formato vertical (MP4 ou MOV)."
      >
        {error && (
          <div className="mb-4">
            <InlineAlert type="err">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="min-w-0">{error}</span>
            </InlineAlert>
          </div>
        )}

        {!hasVideo ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`${dropzoneClass} ${dragging ? 'border-accent bg-accent-tint/50' : ''}`}
          >
            <UploadCloud className="h-6 w-6 text-muted" aria-hidden="true" />
            <span className="text-xs font-bold text-ink">Clique para enviar o vídeo do Reel ou arraste aqui</span>
            <span className="font-mono text-[11px] text-faint">MP4 ou MOV vertical (9:16) · Recomendado até 90s</span>
            <input
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(e) => handleVideoUpload(e.target.files)}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            {/* Card do vídeo enviado */}
            <div className="relative flex items-center gap-3.5 rounded-xl border border-line bg-surface-2 p-3 pr-10 shadow-soft">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface text-accent shadow-sm">
                <Video className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">{videoFile.file?.name || 'Vídeo do Reel'}</p>
                <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-faint">
                  <span>{videoFile.file ? `${(videoFile.file.size / 1024 / 1024).toFixed(1)} MB` : 'MP4/MOV'}</span>
                  <span>•</span>
                  <span>Duração: ~{videoDuration}s</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemoveMedia}
                aria-label="Remover vídeo do Reel"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-muted transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checkbox Compartilhar no Feed (share_to_feed) */}
            <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onShareToFeedChange?.(!shareToFeed)}>
                <button
                  type="button"
                  aria-checked={shareToFeed}
                  role="checkbox"
                  className="text-accent transition-transform active:scale-95 shrink-0"
                >
                  {shareToFeed ? (
                    <CheckSquare className="h-5 w-5 fill-accent text-surface" />
                  ) : (
                    <Square className="h-5 w-5 text-muted" />
                  )}
                </button>
                <div className="text-xs">
                  <span className="font-bold text-ink block">Compartilhar também no Feed</span>
                  <span className="text-[11px] text-muted">Aparecerá na grade principal e na aba Reels do seu perfil</span>
                </div>
              </div>
            </div>

            {/* Seção Capa do Reel */}
            <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-muted" /> Capa do Reel
                </p>
                <div className="flex rounded-lg bg-surface p-0.5 border border-line text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => onCoverTypeChange?.('custom')}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      coverType === 'custom' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Personalizada
                  </button>
                  <button
                    type="button"
                    onClick={() => onCoverTypeChange?.('frame')}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      coverType === 'frame' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Frame do Vídeo
                  </button>
                </div>
              </div>

              {coverType === 'custom' ? (
                <div>
                  {cover ? (
                    <div className="group relative w-max">
                      <img
                        src={cover.url}
                        alt="Capa personalizada do Reel"
                        className="h-36 w-24 rounded-lg border border-line object-cover shadow-soft"
                      />
                      <button
                        type="button"
                        onClick={onRemoveCover}
                        aria-label="Remover capa do Reel"
                        className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ink text-app shadow-soft transition-opacity duration-200 hover:bg-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`${dropzoneClass} py-6`}>
                      <ImagePlus className="h-5 w-5 text-muted" aria-hidden="true" />
                      <span className="text-[11px] font-bold text-ink">Adicionar imagem de capa personalizada</span>
                      <span className="text-[10px] text-faint">PNG ou JPG (proporção 9:16 ou 1:1 recomendada)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => handleCoverUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-accent" /> Selecionar segundo do frame:
                    </span>
                    <span className="font-mono text-accent font-bold">{coverOffsetSec}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 30}
                    step="1"
                    value={coverOffsetSec}
                    onChange={(e) => onCoverOffsetSecChange?.(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                  <p className="text-[10px] text-faint leading-tight">
                    Sem imagem personalizada, a API do Instagram utilizará este ponto de corte como frame de capa.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      <Section
        step="2"
        title="Legenda e Engajamento do Reel"
        hint="Texto que acompanha seu vídeo no feed e na aba Reels."
        aside={
          <span className={`shrink-0 font-mono text-[11px] tabular-nums ${overLimit ? 'font-bold text-danger' : 'text-faint'}`}>
            {composedLen}/{IG_CAPTION_MAX}
          </span>
        }
      >
        <FieldLabel htmlFor="reel-caption">Legenda</FieldLabel>
        <textarea
          id="reel-caption"
          value={caption}
          onChange={(e) => onCaptionChange?.(e.target.value)}
          rows={4}
          placeholder="Escreva a legenda do seu Reel…"
          className={`${fieldClass} resize-y leading-relaxed ${overLimit ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
        />

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
                <button
                  key={e}
                  type="button"
                  onClick={() => { onCaptionChange?.(caption + e); setEmojiOpen(false); }}
                  aria-label={`Inserir ${e}`}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-base transition-colors duration-200 hover:bg-surface-2"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <FieldLabel htmlFor="reel-hashtags">
            <Hash className="h-3.5 w-3.5" aria-hidden="true" /> Hashtags
          </FieldLabel>
          <input
            id="reel-hashtags"
            value={hashtags}
            onChange={(e) => onHashtagsChange?.(e.target.value)}
            placeholder="viral, reels, instagram"
            className={fieldClass}
          />
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="rounded-md bg-accent-tint px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                  {t}
                </span>
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
              id="reel-first-comment"
              value={firstComment}
              onChange={(e) => onFirstCommentChange?.(e.target.value)}
              placeholder="Comentário automático logo após publicar…"
              className={fieldClass}
            />
          </div>
        </details>
      </Section>

      <Note>
        Reels são vídeos na vertical (9:16) exibidos na aba de Reels e, opcionalmente, na grade do Feed principal. O arquivo de vídeo fica em armazenamento temporário no servidor até a postagem ser concluída pela Meta.
      </Note>
    </div>
  );
}
