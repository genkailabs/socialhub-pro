import { X, ExternalLink, ShieldAlert } from 'lucide-react';

export function StoryPreview({
  media = [],
  storyOverlay = {},
  brandName = 'sua_marca'
}) {
  const view = media[0];

  const {
    text = '',
    align = 'center',
    size = 'md',
    vertical = 'center',
    horizontal = 'center',
    ctaText = '',
    ctaUrl = ''
  } = storyOverlay || {};

  // Alinhamento de texto Tailwind
  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';

  // Tamanho de fonte
  const sizeClass =
    size === 'sm'
      ? 'text-xs md:text-sm font-semibold px-2.5 py-1'
      : size === 'lg'
        ? 'text-base md:text-lg font-black px-4 py-2 leading-tight'
        : 'text-sm md:text-base font-bold px-3.5 py-1.5 leading-snug';

  // Posição vertical na tela
  let justifyClass = 'justify-center';
  if (vertical === 'top') justifyClass = 'justify-start pt-20'; // respeita safe area superior
  else if (vertical === 'bottom') justifyClass = 'justify-end pb-24'; // respeita safe area inferior

  // Posição horizontal
  let itemsClass = 'items-center';
  if (horizontal === 'left') itemsClass = 'items-start pl-4';
  else if (horizontal === 'right') itemsClass = 'items-end pr-4';

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-line bg-black shadow-soft select-none">
      {/* Barra de progresso do Story */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex gap-1.5">
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
          <div className="h-full w-2/5 rounded-full bg-white transition-all duration-300" />
        </div>
      </div>

      {/* Header e Sombra Superior (Safe Area Top) */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-5 pb-8 px-3">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] p-[1.5px]">
              <div className="h-full w-full rounded-full bg-black p-[1px]">
                <div className="h-full w-full rounded-full bg-gradient-to-br from-accent to-accent-soft" />
              </div>
            </div>
            <span className="text-xs font-bold drop-shadow-md">{brandName}</span>
            <span className="text-[10px] text-white/70 drop-shadow-md">• 2h</span>
          </div>
          <X className="h-4 w-4 drop-shadow-md cursor-pointer text-white/90 hover:text-white" />
        </div>
      </div>

      {/* Sombreamento da Safe Area Superior e Inferior demarcadas para o criador */}
      <div className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none border-t border-dashed border-white/20 flex justify-center pt-8">
        <span className="text-[8px] uppercase tracking-widest font-mono text-white/30 drop-shadow">Safe Area Sup</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-20 z-10 pointer-events-none border-b border-dashed border-white/20 flex justify-center items-end pb-2">
        <span className="text-[8px] uppercase tracking-widest font-mono text-white/30 drop-shadow">Safe Area Inf</span>
      </div>

      {/* Camada da Mídia (Fundo) */}
      <div className="absolute inset-0 z-0 bg-surface-2/20 flex items-center justify-center">
        {view ? (
          view.isVideo ? (
            <video src={view.url} className="h-full w-full object-cover" muted autoPlay loop playsInline />
          ) : (
            <img src={view.url} alt="Mídia do Story" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="grid h-full place-items-center text-center p-6 text-white/40 font-medium text-xs">
            A mídia do Story no formato 9:16 aparecerá aqui
          </div>
        )}
      </div>

      {/* Camada do Overlay Editor de Texto */}
      <div className={`absolute inset-0 z-10 flex flex-col pointer-events-none ${justifyClass} ${itemsClass}`}>
        {text && (
          <div className="max-w-[85%] px-2">
            <div
              className={`rounded-xl bg-black/75 text-white shadow-lg backdrop-blur-md border border-white/10 ${sizeClass} ${alignClass}`}
            >
              <p className="whitespace-pre-wrap break-words">{text}</p>
            </div>
          </div>
        )}
      </div>

      {/* CTA ou Sticker de Link na parte inferior (Safe area) */}
      {(ctaText || ctaUrl) && (
        <div className="absolute bottom-16 left-0 right-0 z-15 flex justify-center px-4 pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-black shadow-lift backdrop-blur-md transition-transform">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
              <ExternalLink className="h-3 w-3" />
            </span>
            <span className="truncate max-w-[150px]">{ctaText || 'Ver link'}</span>
          </div>
        </div>
      )}

      {/* Barra de Responder Story (Rodapé Instagram) */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-3 px-3 flex items-center gap-2">
        <div className="h-8 flex-1 rounded-full border border-white/30 bg-black/30 backdrop-blur-sm px-3 flex items-center text-[11px] text-white/60">
          Enviar mensagem…
        </div>
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm">
          ❤️
        </div>
      </div>
    </div>
  );
}
