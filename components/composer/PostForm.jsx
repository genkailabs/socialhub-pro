'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ImagePlus, X, Hash, Smile, ChevronRight, MessageCircle,
  Eye, AlertCircle, Layers, Film
} from 'lucide-react';
import { Section, FieldLabel, fieldClass, dropzoneClass } from './ComposerSection';
import { normalizeHashtags, composeCaption, IG_CAPTION_MAX } from '@/lib/posts-media';

const EMOJIS = ['🔥', '🚀', '✨', '💡', '🎉', '❤️', '👏', '📈', '✅', '👀', '💬', '🙌'];

export function PostForm({
  media = [],
  onAddMedia,
  onRemoveMedia,
  caption = '',
  onCaptionChange,
  hashtags = '',
  onHashtagsChange,
  firstComment = '',
  onFirstCommentChange,
  altText = '',
  onAltTextChange,
  onSuggestFormat
}) {
  const [dragging, setDragging] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [warningAlert, setWarningAlert] = useState(null);
  const emojiRef = useRef(null);

  const currentMedia = media[0];
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

  function handleFilesInput(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (files.some(f => f.type.startsWith('video/'))) {
      setWarningAlert({
        type: 'reel',
        text: 'Vídeos detectados! Para postar vídeos no Instagram, utilize o formato Reel.',
        files
      });
      return;
    }

    if (files.length > 1 || (media.length > 0 && files.length + media.length > 1)) {
      setWarningAlert({
        type: 'carousel',
        text: `Você selecionou ${files.length} imagens. O formato Post aceita apenas 1 imagem (para 2 a 10 imagens, use Carrossel).`,
        files
      });
      return;
    }

    setWarningAlert(null);
    onAddMedia(files);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleFilesInput(event.dataTransfer?.files);
  }

  return (
    <div className="space-y-4">
      <Section step="1" title="Imagem única" hint="Uma imagem no formato 1:1 (quadrado), 4:5 (vertical) ou 1.91:1 (paisagem).">
        {warningAlert && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold leading-relaxed">{warningAlert.text}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {warningAlert.type === 'carousel' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSuggestFormat?.('carousel', warningAlert.files);
                        setWarningAlert(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-bold text-white shadow-soft transition-colors hover:bg-accent/90"
                    >
                      <Layers className="h-3.5 w-3.5" /> Mudar para Carrossel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSuggestFormat?.('reel', warningAlert.files);
                        setWarningAlert(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-bold text-white shadow-soft transition-colors hover:bg-accent/90"
                    >
                      <Film className="h-3.5 w-3.5" /> Mudar para Reel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setWarningAlert(null)}
                    className="rounded-lg border border-line px-2.5 py-1.5 font-semibold text-ink hover:bg-surface"
                  >
                    Dispensar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentMedia ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="group relative w-36">
              <img
                src={currentMedia.url}
                alt="Post selecionado"
                className="h-36 w-36 rounded-xl border border-line object-cover shadow-soft"
              />
              <button
                type="button"
                onClick={() => { setWarningAlert(null); onRemoveMedia(0); }}
                aria-label="Remover imagem"
                className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ink text-app shadow-soft transition-colors duration-200 hover:bg-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 text-xs">
              <p className="truncate font-bold text-ink">{currentMedia.file?.name || 'Imagem do Post'}</p>
              <p className="font-mono text-[11px] text-muted">
                {currentMedia.width && currentMedia.height
                  ? `${currentMedia.width}×${currentMedia.height}px (${currentMedia.aspectRatio || '1:1'})`
                  : 'Proporção detectada: 1:1 / 4:5'}
              </p>
              {currentMedia.file && (
                <p className="font-mono text-[11px] text-faint">
                  {(currentMedia.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`${dropzoneClass} ${dragging ? 'border-accent bg-accent-tint/50' : ''}`}
          >
            <ImagePlus className="h-6 w-6 text-muted" aria-hidden="true" />
            <span className="text-xs font-bold text-ink">Arraste a imagem ou clique para enviar</span>
            <span className="font-mono text-[11px] text-faint">Exatamente 1 arquivo PNG ou JPG · até 30MB</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesInput(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </Section>

      <Section
        step="2"
        title="Texto do post e Acessibilidade"
        hint="Legenda, hashtags, comentário inicial e texto alternativo."
        aside={
          <span className={`shrink-0 font-mono text-[11px] tabular-nums ${overLimit ? 'font-bold text-danger' : 'text-faint'}`}>
            {composedLen}/{IG_CAPTION_MAX}
          </span>
        }
      >
        <FieldLabel htmlFor="post-caption">Legenda</FieldLabel>
        <textarea
          id="post-caption"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          rows={5}
          placeholder="Escreva a legenda do post…"
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
                  onClick={() => { onCaptionChange(caption + e); setEmojiOpen(false); }}
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
          <FieldLabel htmlFor="post-hashtags">
            <Hash className="h-3.5 w-3.5" aria-hidden="true" /> Hashtags
          </FieldLabel>
          <input
            id="post-hashtags"
            value={hashtags}
            onChange={(e) => onHashtagsChange(e.target.value)}
            placeholder="marketing, social, dicas"
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

        <div className="mt-5">
          <FieldLabel htmlFor="post-alt-text" hint="opcional">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Alt Text (Texto alternativo)
          </FieldLabel>
          <input
            id="post-alt-text"
            value={altText}
            onChange={(e) => onAltTextChange(e.target.value)}
            placeholder="Descreva a imagem para pessoas com deficiência visual ou leitores de tela..."
            className={fieldClass}
          />
          <p className="mt-1 text-[11px] text-faint">Ajuda na acessibilidade e melhora a indexação da publicação.</p>
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
              id="post-first-comment"
              value={firstComment}
              onChange={(e) => onFirstCommentChange(e.target.value)}
              placeholder="Comentário automático logo após publicar…"
              className={fieldClass}
            />
            <p className="mt-2 text-[11px] text-faint">Bom lugar para as hashtags caso prefira não deixá-las na legenda principal.</p>
          </div>
        </details>
      </Section>
    </div>
  );
}
