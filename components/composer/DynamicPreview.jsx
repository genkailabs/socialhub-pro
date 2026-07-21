import {
  Heart, MessageCircle, Bookmark, Send, ChevronLeft, ChevronRight, X, Music
} from 'lucide-react';

export function DynamicPreview({
  format,
  media,
  slide,
  onSlideChange,
  caption,
  brandName,
  cover
}) {
  const isFeed = format === 'image' || format === 'carousel';
  const isStory = format === 'stories';
  const isReel = format === 'reel';

  const view = media[slide] || media[0];

  if (isStory) {
    return (
      <div className="overflow-hidden rounded-2xl glass shadow-soft relative aspect-[9/16] bg-black">
        {/* Progress bar */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          <div className="h-0.5 bg-white/40 flex-1 rounded-full overflow-hidden">
            <div className="bg-white h-full w-1/3" />
          </div>
        </div>
        
        {/* Header */}
        <div className="absolute top-4 left-3 right-3 flex items-center justify-between z-10 text-white drop-shadow-md">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-accent to-accent-soft border border-white/20" />
            <span className="text-xs font-bold drop-shadow-md">{brandName}</span>
          </div>
          <X className="h-4 w-4 drop-shadow-md" />
        </div>

        {/* Media */}
        <div className="absolute inset-0 z-0 bg-surface-2/20 backdrop-blur">
          {view ? (
            view.isVideo ? (
              <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
            ) : (
              <img src={view.url} alt="prévia" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="grid h-full place-items-center text-[11px] text-white/50">
              A mídia aparece aqui
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isReel) {
    return (
      <div className="overflow-hidden rounded-2xl glass shadow-soft relative aspect-[9/16] bg-black">
        {/* Media */}
        <div className="absolute inset-0 z-0 bg-surface-2/20 backdrop-blur">
          {view?.isVideo && !cover ? (
            <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : cover ? (
            <img src={cover.url} alt="capa" className="h-full w-full object-cover" />
          ) : view ? (
            view.isVideo ? (
              <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
            ) : (
              <img src={view.url} alt="prévia" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="grid h-full place-items-center text-[11px] text-white/50">
              A mídia aparece aqui
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="absolute bottom-20 right-2 flex flex-col items-center gap-4 z-10 text-white drop-shadow-md">
          <div className="flex flex-col items-center gap-1"><Heart className="h-6 w-6" /></div>
          <div className="flex flex-col items-center gap-1"><MessageCircle className="h-6 w-6" /></div>
          <div className="flex flex-col items-center gap-1"><Send className="h-6 w-6" /></div>
          <div className="mt-2 h-7 w-7 rounded-md bg-white/20 border border-white flex items-center justify-center animate-spin-slow">
            <Music className="h-3 w-3" />
          </div>
        </div>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
          <div className="flex items-center gap-2 mb-2 text-white">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-accent to-accent-soft border border-white/20" />
            <span className="text-xs font-bold drop-shadow-md">{brandName}</span>
          </div>
          <p className="line-clamp-2 text-xs text-white drop-shadow-md">
            {caption || 'A legenda aparece aqui…'}
          </p>
        </div>
      </div>
    );
  }

  // Feed (image / carousel)
  return (
    <div className="overflow-hidden rounded-2xl glass shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <span className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-accent-soft" />
        <span className="text-xs font-bold text-ink">{brandName}</span>
        {media.length > 1 && (
          <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted">
            {slide + 1}/{media.length}
          </span>
        )}
      </div>

      {/* Media */}
      <div className="relative aspect-square w-full bg-surface-2">
        {view ? (
          view.isVideo ? (
            <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : (
            <img src={view.url} alt="prévia" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full place-items-center text-[11px] text-faint">
            A mídia aparece aqui
          </div>
        )}

        {/* Carousel controls */}
        {media.length > 1 && (
          <>
            <button
              onClick={() => onSlideChange(Math.max(0, slide - 1))}
              className="absolute left-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onSlideChange(Math.min(media.length - 1, slide + 1))}
              className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {media.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === slide ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="space-y-1.5 p-3">
        <div className="flex gap-3 text-ink">
          <Heart className="h-4 w-4" />
          <MessageCircle className="h-4 w-4" />
          <Send className="h-4 w-4" />
          <Bookmark className="ml-auto h-4 w-4" />
        </div>
        <p className="line-clamp-2 text-xs text-ink whitespace-pre-wrap">
          <span className="font-bold">{brandName}</span> {caption || 'A legenda aparece aqui…'}
        </p>
      </div>
    </div>
  );
}
