import { cn } from '@/lib/utils';

/**
 * Miniatura de um conteúdo na lista de produção.
 *
 * Quando existe imagem, mostra a imagem. Quando não existe — e no rascunho é o
 * caso mais comum — mostra as primeiras palavras da headline sobre um degradê.
 * Um placeholder cinza igual para todos faria a lista inteira parecer a mesma
 * coisa; o degradê vem do id do conteúdo, então cada peça guarda a sua cor
 * entre recarregamentos, sem sortear nada a cada render.
 */
const GRADIENTS = [
  'from-accent to-accent-soft',
  'from-cyan to-accent',
  'from-accent-soft to-cyan',
  'from-accent to-[#3B2F87]',
  'from-cyan to-[#0F3D52]',
  'from-lime to-cyan'
];

export function thumbnailGradient(seed = '') {
  let total = 0;
  for (const char of String(seed)) total += char.charCodeAt(0);
  return GRADIENTS[total % GRADIENTS.length];
}

export function ContentThumbnail({ id = '', title = '', imageUrl = null, className = '' }) {
  const words = String(title).trim().split(/\s+/).filter(Boolean).slice(0, 4).join(' ');

  return (
    <span
      className={cn(
        'relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br',
        !imageUrl && thumbnailGradient(id || title),
        className
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="px-1 text-center text-[7px] font-bold leading-[9px] text-white/90">{words}</span>
      )}
    </span>
  );
}
