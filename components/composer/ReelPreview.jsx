import { useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Play, CheckSquare } from 'lucide-react';
import { normalizeHashtags } from '@/lib/posts-media';

export function ReelPreview({
  media = [],
  cover = null,
  caption = '',
  hashtags = '',
  brandName = 'sua_marca',
  shareToFeed = true
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const view = media[0];
  const tags = normalizeHashtags(hashtags);

  function togglePlay() {
    setIsPlaying(!isPlaying);
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-line bg-black shadow-soft select-none">
      {/* Selo superior ou indicador de Compartilhado no Feed */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white backdrop-blur-md border border-white/10">
            REEL
          </span>
          {shareToFeed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm backdrop-blur-md">
              <CheckSquare className="h-2.5 w-2.5" /> No Feed
            </span>
          )}
        </div>
      </div>

      {/* Camada da Mídia */}
      <div
        onClick={togglePlay}
        className="absolute inset-0 z-0 bg-surface-2/20 flex items-center justify-center cursor-pointer"
      >
        {view?.isVideo && isPlaying ? (
          <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
        ) : cover ? (
          <img src={cover.url} alt="Capa do Reel" className="h-full w-full object-cover" />
        ) : view ? (
          view.isVideo ? (
            <video src={view.url} className="h-full w-full object-cover" muted loop playsInline />
          ) : (
            <img src={view.url} alt="Capa" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full place-items-center text-center p-6 text-white/40 font-medium text-xs">
            O vídeo do Reel (9:16) aparecerá aqui
          </div>
        )}

        {/* Ícone Play se pausado ou se estiver exibindo capa estática */}
        {!isPlaying && view?.isVideo && (
          <div className="absolute grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform scale-110">
            <Play className="h-6 w-6 fill-current ml-0.5" />
          </div>
        )}
      </div>

      {/* Interações Laterais do Reels (Direita) */}
      <div className="absolute bottom-16 right-2.5 z-20 flex flex-col items-center gap-4 text-white">
        <button
          type="button"
          onClick={() => setLiked(!liked)}
          aria-label="Curtir"
          className="flex flex-col items-center gap-1 group cursor-pointer transition-transform active:scale-125"
        >
          <Heart className={`h-6 w-6 drop-shadow-md transition-colors ${liked ? 'fill-danger text-danger' : 'text-white'}`} />
          <span className="text-[10px] font-bold drop-shadow-md">{liked ? '1' : 'Curtir'}</span>
        </button>

        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <MessageCircle className="h-6 w-6 drop-shadow-md text-white" />
          <span className="text-[10px] font-bold drop-shadow-md">Comentar</span>
        </div>

        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <Send className="h-6 w-6 drop-shadow-md text-white" />
          <span className="text-[10px] font-bold drop-shadow-md">Enviar</span>
        </div>

        <MoreVertical className="h-5 w-5 drop-shadow-md text-white my-1 cursor-pointer" />

        {/* Áudio giratório inferior direito */}
        <div className="mt-1 h-7 w-7 rounded-md border-2 border-white/80 bg-black/60 p-0.5 flex items-center justify-center shadow-md overflow-hidden animate-spin">
          <Music className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* Legenda e Identificação na Base (Respeitando Safe Area Inferior) */}
      <div className="absolute bottom-0 left-0 right-14 z-10 p-3 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[1.5px]">
            <div className="h-full w-full rounded-full bg-black p-[1px]">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-accent to-accent-soft" />
            </div>
          </div>
          <span className="text-xs font-bold drop-shadow-md truncate">{brandName}</span>
          <button type="button" className="rounded-md border border-white/40 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">
            Seguir
          </button>
        </div>

        <div className="text-xs leading-snug drop-shadow-md pr-2">
          <p className={expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
            {caption || <span className="text-white/60 font-normal">A legenda do Reel aparecerá aqui…</span>}
            {tags.length > 0 && (
              <span className="block mt-1 text-white/90 font-semibold">
                {tags.join(' ')}
              </span>
            )}
          </p>
          {(caption?.length > 70 || tags.length > 0) && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-0.5 text-[10px] font-bold text-white/70 hover:text-white cursor-pointer"
            >
              mais
            </button>
          )}
        </div>

        {/* Faixa de Áudio */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/80 font-medium">
          <Music className="h-3 w-3 shrink-0 animate-pulse" />
          <span className="truncate">Áudio original - {brandName}</span>
        </div>
      </div>
    </div>
  );
}
