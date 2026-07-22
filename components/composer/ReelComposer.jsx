import { useState } from 'react';
import { UploadCloud, X, ImagePlus, AlertCircle, Video } from 'lucide-react';
import { Note, InlineAlert, dropzoneClass } from './ComposerSection';

export function ReelComposer({ media, cover, onAddMedia, onRemoveMedia, onAddCover, onRemoveCover }) {
  const [error, setError] = useState('');

  function handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Reel requer um arquivo de vídeo MP4 ou MOV.');
      return;
    }

    setError('');
    onAddMedia([file]);
  }

  function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('A capa deve ser uma imagem (JPG/PNG).');
      return;
    }

    setError('');
    onAddCover(file);
  }

  const hasVideo = media.length > 0 && media[0].isVideo;
  const videoFile = hasVideo ? media[0] : null;

  return (
    <div className="space-y-3">
      {error && (
        <InlineAlert type="err">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0">{error}</span>
        </InlineAlert>
      )}

      {!hasVideo ? (
        <label className={dropzoneClass}>
          <UploadCloud className="h-5 w-5 text-muted" aria-hidden="true" />
          <span className="text-xs font-bold text-ink">Clique para enviar o vídeo do Reel</span>
          <span className="text-[11px] text-faint">MP4 ou MOV (9:16) · até 100MB</span>
          <input type="file" accept="video/mp4,video/quicktime" onChange={handleVideoUpload} className="hidden" />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 pr-10">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface text-muted">
              <Video className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">{videoFile.file.name}</p>
              <p className="font-mono text-[11px] tabular-nums text-faint">{(videoFile.file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={onRemoveMedia}
              aria-label="Remover vídeo do Reel"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-muted transition-colors duration-200 hover:bg-surface hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl border border-line bg-surface-2/50 p-3.5">
            <p className="mb-2.5 text-xs font-bold text-ink">
              Capa do Reel <span className="font-normal text-faint">opcional</span>
            </p>

            {cover ? (
              <div className="group relative w-max">
                <img src={cover.url} alt="Capa do Reel" className="h-32 w-20 rounded-lg border border-line object-cover" />
                <button
                  type="button"
                  onClick={onRemoveCover}
                  aria-label="Remover capa do Reel"
                  className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ink text-app opacity-0 shadow-soft transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className={`${dropzoneClass} py-5`}>
                <ImagePlus className="h-5 w-5 text-muted" aria-hidden="true" />
                <span className="text-[11px] font-bold text-ink">Adicionar capa personalizada</span>
                <span className="text-[10px] text-faint">Sem capa, o Instagram usa o 1º frame</span>
                <input type="file" accept="image/jpeg,image/png" onChange={handleCoverUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>
      )}

      <Note>Reels aparecem no feed e na aba Reels. O vídeo é apagado do servidor temporário após a postagem.</Note>
    </div>
  );
}
