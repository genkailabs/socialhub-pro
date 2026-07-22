import { useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { normalizeHashtags } from '@/lib/posts-media';

export function PostPreview({
  media = [],
  caption = '',
  hashtags = '',
  brandName = 'sua_marca',
  altText = ''
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const view = media[0];
  const tags = normalizeHashtags(hashtags);

  // Determinar classe de proporção adaptativa
  let aspectClass = 'aspect-square'; // 1:1 padrão
  if (view?.aspectRatio === '4:5' || (view?.aspectRatioRatio && view.aspectRatioRatio < 0.9)) {
    aspectClass = 'aspect-[4/5]';
  } else if (view?.aspectRatio === '1.91:1' || (view?.aspectRatioRatio && view.aspectRatioRatio > 1.3)) {
    aspectClass = 'aspect-[1.91/1]';
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
          view.isVideo ? (
            <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : (
            <img src={view.url} alt={altText || 'Prévia do Post'} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full place-items-center text-center p-4">
            <span className="text-[11px] font-medium text-faint">A imagem aparecerá aqui na proporção {view?.aspectRatio || '1:1'}</span>
          </div>
        )}

        {/* Selo ALT se houver texto alternativo */}
        {altText && view && (
          <div className="absolute bottom-2.5 left-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white backdrop-blur-sm" title={`Alt text: ${altText}`}>
            ALT
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
