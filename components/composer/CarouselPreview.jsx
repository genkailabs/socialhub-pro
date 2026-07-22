import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { normalizeHashtags } from '@/lib/posts-media';

export function CarouselPreview({
  media = [],
  slide = 0,
  onSlideChange,
  caption = '',
  hashtags = '',
  brandName = 'sua_marca'
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const safeSlide = Math.min(Math.max(0, slide), Math.max(0, media.length - 1));
  const view = media[safeSlide] || media[0];
  const tags = normalizeHashtags(hashtags);

  // O Slide 1 dita a proporção visual do carrossel na prévia
  const refSlide = media[0];
  let aspectClass = 'aspect-square';
  if (refSlide?.aspectRatio === '4:5' || (refSlide?.aspectRatioRatio && refSlide.aspectRatioRatio < 0.9)) {
    aspectClass = 'aspect-[4/5]';
  } else if (refSlide?.aspectRatio === '1.91:1' || (refSlide?.aspectRatioRatio && refSlide.aspectRatioRatio > 1.3)) {
    aspectClass = 'aspect-[1.91/1]';
  }

  function goPrev() {
    if (safeSlide > 0 && onSlideChange) {
      onSlideChange(safeSlide - 1);
    }
  }

  function goNext() {
    if (safeSlide < media.length - 1 && onSlideChange) {
      onSlideChange(safeSlide + 1);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[2px]">
            <div className="h-full w-full rounded-full bg-surface p-[1px]">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-accent to-accent-soft" />
            </div>
          </div>
          <span className="truncate text-xs font-bold text-ink">{brandName}</span>
        </div>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-muted" />
      </div>

      {/* Media Box */}
      <div className={`relative w-full bg-surface-2 ${aspectClass}`}>
        {view ? (
          <img src={view.url} alt={`Slide ${safeSlide + 1}`} className="h-full w-full object-cover transition-all duration-300" />
        ) : (
          <div className="grid h-full place-items-center text-center p-4">
            <span className="text-[11px] font-medium text-faint">Os slides aparecerão aqui no formato {refSlide?.aspectRatio || '1:1'}</span>
          </div>
        )}

        {/* Indicador de Contagem superior direito */}
        {media.length > 1 && (
          <div className="absolute top-2.5 right-2.5 rounded-full bg-black/75 px-2.5 py-1 font-mono text-[11px] font-bold tracking-tight text-white backdrop-blur-sm shadow-sm">
            {safeSlide + 1}/{media.length}
          </div>
        )}

        {/* Setas Esquerda / Direita */}
        {media.length > 1 && safeSlide > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Slide anterior"
            className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {media.length > 1 && safeSlide < media.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Próximo slide"
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Indicadores Pontos inferiores (Dots) */}
        {media.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSlideChange && onSlideChange(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === safeSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setLiked(!liked)}
              aria-label="Curtir"
              className={`cursor-pointer transition-transform active:scale-125 ${liked ? 'text-danger' : 'text-ink hover:text-muted'}`}
            >
              <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
            </button>
            <MessageCircle className="h-5 w-5 text-ink hover:text-muted cursor-pointer transition-colors" />
            <Send className="h-5 w-5 text-ink hover:text-muted cursor-pointer transition-colors" />
          </div>
          <button
            type="button"
            onClick={() => setSaved(!saved)}
            aria-label="Salvar"
            className={`cursor-pointer transition-transform active:scale-125 ${saved ? 'text-ink' : 'text-ink hover:text-muted'}`}
          >
            <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Curtidas aproximadas */}
        <p className="text-[11px] font-bold text-ink">Curtido por marca_parceira e outras pessoas</p>

        {/* Legenda e hashtags */}
        <div className="text-xs text-ink leading-relaxed">
          <span className="font-bold mr-1.5">{brandName}</span>
          <span className={expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
            {caption || <span className="text-faint font-normal">A legenda aparecerá aqui…</span>}
            {tags.length > 0 && (
              <span className="block mt-1 text-accent font-medium">
                {tags.join(' ')}
              </span>
            )}
          </span>
          {(caption?.length > 80 || tags.length > 0) && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-0.5 text-[11px] font-semibold text-muted hover:text-ink cursor-pointer"
            >
              mais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
