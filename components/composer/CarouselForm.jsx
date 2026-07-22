'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Layers, ImagePlus, X, Hash, Smile, ChevronRight, MessageCircle,
  AlertCircle, GripVertical, ArrowUp, ArrowDown, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Section, FieldLabel, Note, fieldClass, dropzoneClass } from './ComposerSection';
import { normalizeHashtags, composeCaption, IG_CAPTION_MAX, IG_CAROUSEL_MIN, IG_CAROUSEL_MAX } from '@/lib/posts-media';

const EMOJIS = ['🔥', '🚀', '✨', '💡', '🎉', '❤️', '👏', '📈', '✅', '👀', '💬', '🙌'];

export function CarouselForm({
  media = [],
  onAddMedia,
  onRemoveMedia,
  onReorderMedia,
  onReplaceMedia,
  slide = 0,
  onSlideChange,
  caption = '',
  onCaptionChange,
  hashtags = '',
  onHashtagsChange,
  firstComment = '',
  onFirstCommentChange
}) {
  const [draggingDropzone, setDraggingDropzone] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
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

  // Verificar divergência de proporção em relação ao Slide 1
  const refSlide = media[0];
  const divergentSlides = media.filter((m, i) => i > 0 && refSlide?.aspectRatio && m.aspectRatio && m.aspectRatio !== refSlide.aspectRatio);

  function handleDropzoneFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (files.length) onAddMedia(files);
  }

  function handleReplaceInput(index, fileList) {
    const file = fileList?.[0];
    if (file && file.type.startsWith('image/')) {
      onReplaceMedia(index, file);
    }
  }

  // Drag and drop HTML5 para reordenação
  function handleDragStart(e, index) {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  }

  function handleDragEnd() {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleDropItem(e, targetIdx) {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIdx) {
      onReorderMedia(draggedIdx, targetIdx);
    }
    handleDragEnd();
  }

  function moveSlideUp(index) {
    if (index <= 0) return;
    onReorderMedia(index, index - 1);
  }

  function moveSlideDown(index) {
    if (index >= media.length - 1) return;
    onReorderMedia(index, index + 1);
  }

  return (
    <div className="space-y-4">
      <Section
        step="1"
        title="Gerenciador de Slides"
        hint={`Envie de ${IG_CAROUSEL_MIN} a ${IG_CAROUSEL_MAX} imagens. Arraste as linhas para reordenar a sequência.`}
        aside={
          <span className={`shrink-0 font-mono text-[11px] font-bold ${media.length < IG_CAROUSEL_MIN || media.length > IG_CAROUSEL_MAX ? 'text-danger' : 'text-accent'}`}>
            {media.length}/{IG_CAROUSEL_MAX} slides
          </span>
        }
      >
        {/* Aviso se menos de 2 imagens */}
        {media.length < IG_CAROUSEL_MIN && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs font-semibold text-warning flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>O formato Carrossel do Instagram requer no mínimo {IG_CAROUSEL_MIN} imagens (atualmente você tem {media.length}).</span>
          </div>
        )}

        {/* Aviso se proporção divergente em relação ao Slide 1 */}
        {divergentSlides.length > 0 && refSlide && (
          <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Aviso de Proporção Divergente</span>
            </div>
            <p className="leading-relaxed">
              O Slide 1 define a proporção de referência visual do carrossel (<strong>{refSlide.aspectRatio || '1:1'}</strong>).{' '}
              {divergentSlides.length === 1 ? 'O slide com proporção diferente será cortado' : `Os ${divergentSlides.length} slides com proporção diferente serão cortados`} automaticamente ao centro pelo Instagram.
            </p>
          </div>
        )}

        {/* Lista reordenável de slides */}
        {media.length > 0 && (
          <div className="mb-4 space-y-2">
            {media.map((m, i) => {
              const isSelected = i === slide;
              const isDivergent = i > 0 && refSlide?.aspectRatio && m.aspectRatio && m.aspectRatio !== refSlide.aspectRatio;

              return (
                <div
                  key={`${m.url}-${i}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDropItem(e, i)}
                  onClick={() => onSlideChange?.(i)}
                  className={`group flex items-center gap-3 rounded-xl border p-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent-tint/30 shadow-soft'
                      : dragOverIdx === i
                        ? 'border-accent border-dashed bg-surface-2'
                        : 'border-line bg-surface-2/60 hover:border-line-strong'
                  }`}
                >
                  {/* Alça de arrasto D&D HTML5 */}
                  <div
                    title="Arrastar e reordenar slide"
                    className="cursor-grab active:cursor-grabbing p-1 text-muted hover:text-ink shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Número do slide e badge */}
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface font-mono text-xs font-bold text-ink shadow-sm">
                    #{i + 1}
                  </div>

                  {/* Miniatura */}
                  <img
                    src={m.url}
                    alt={`Slide ${i + 1}`}
                    className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover bg-surface"
                  />

                  {/* Metadados e Status */}
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-ink">{m.file?.name || `Slide #${i + 1}`}</p>
                      {i === 0 && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent">
                          Referência
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-faint">
                      <span>{m.file?.name?.split('.').pop()?.toUpperCase() || 'JPG'}</span>
                      <span>•</span>
                      <span>{m.aspectRatio || '1:1'}</span>
                      {isDivergent ? (
                        <span className="text-warning font-semibold flex items-center gap-1">
                          • Divergente ({m.aspectRatio})
                        </span>
                      ) : (
                        <span className="text-success flex items-center gap-1">
                          • Pronto <CheckCircle2 className="h-3 w-3 inline" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botões de Acessibilidade p/ reordenar */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => moveSlideUp(i)}
                      disabled={i === 0}
                      aria-label="Mover slide para cima"
                      title="Mover para cima"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlideDown(i)}
                      disabled={i === media.length - 1}
                      aria-label="Mover slide para baixo"
                      title="Mover para baixo"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    {/* Botão de Substituir */}
                    <label
                      title="Substituir imagem"
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleReplaceInput(i, e.target.files)}
                        className="hidden"
                      />
                    </label>

                    {/* Botão de Remover */}
                    <button
                      type="button"
                      onClick={() => onRemoveMedia(i)}
                      aria-label="Remover slide"
                      title="Remover slide"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dropzone para adicionar mais imagens */}
        {media.length < IG_CAROUSEL_MAX && (
          <label
            onDragOver={(e) => { e.preventDefault(); setDraggingDropzone(true); }}
            onDragLeave={() => setDraggingDropzone(false)}
            onDrop={(e) => { e.preventDefault(); setDraggingDropzone(false); handleDropzoneFiles(e.dataTransfer?.files); }}
            className={`${dropzoneClass} ${draggingDropzone ? 'border-accent bg-accent-tint/50' : ''}`}
          >
            <ImagePlus className="h-6 w-6 text-muted" aria-hidden="true" />
            <span className="text-xs font-bold text-ink">
              Arraste imagens ou clique para enviar {media.length > 0 ? `mais (${IG_CAROUSEL_MAX - media.length} restantes)` : 'os slides'}
            </span>
            <span className="font-mono text-[11px] text-faint">PNG ou JPG · Recomendado proporção única p/ todos os slides</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleDropzoneFiles(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </Section>

      <Section
        step="2"
        title="Legenda única para o Carrossel"
        hint="No Instagram, o texto e as hashtags são compartilhados por todos os slides."
        aside={
          <span className={`shrink-0 font-mono text-[11px] tabular-nums ${overLimit ? 'font-bold text-danger' : 'text-faint'}`}>
            {composedLen}/{IG_CAPTION_MAX}
          </span>
        }
      >
        <FieldLabel htmlFor="carousel-caption">Legenda</FieldLabel>
        <textarea
          id="carousel-caption"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          rows={5}
          placeholder="Escreva a legenda do carrossel…"
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
          <FieldLabel htmlFor="carousel-hashtags">
            <Hash className="h-3.5 w-3.5" aria-hidden="true" /> Hashtags
          </FieldLabel>
          <input
            id="carousel-hashtags"
            value={hashtags}
            onChange={(e) => onHashtagsChange(e.target.value)}
            placeholder="marketing, social, carrossel"
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
              id="carousel-first-comment"
              value={firstComment}
              onChange={(e) => onFirstCommentChange(e.target.value)}
              placeholder="Comentário automático logo após publicar…"
              className={fieldClass}
            />
            <p className="mt-2 text-[11px] text-faint">As hashtags também podem ser colocadas no primeiro comentário.</p>
          </div>
        </details>
      </Section>
    </div>
  );
}
