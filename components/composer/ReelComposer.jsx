import { useState } from 'react';
import { UploadCloud, X, ImagePlus, AlertCircle, Video } from 'lucide-react';

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
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!hasVideo ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2 p-8 text-center transition-colors hover:border-accent hover:bg-accent-tint/30">
          <UploadCloud className="h-8 w-8 text-muted" />
          <div>
            <span className="block text-sm font-bold text-ink">Selecionar Vídeo para Reel</span>
            <span className="mt-1 block text-[11px] text-faint">MP4 ou MOV (9:16) • Até 100MB</span>
          </div>
          <input type="file" accept="video/mp4,video/quicktime" onChange={handleVideoUpload} className="hidden" />
        </label>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
              <Video className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">{videoFile.file.name}</p>
              <p className="text-[11px] text-faint">{(videoFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              type="button" 
              onClick={onRemoveMedia}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-surface hover:text-danger transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h4 className="mb-3 text-xs font-bold text-ink">Capa do Reel</h4>
            
            {cover ? (
              <div className="group relative w-max">
                <img 
                  src={cover.url} 
                  alt="Capa" 
                  className="h-32 w-20 rounded-lg border border-line object-cover"
                />
                <button 
                  type="button" 
                  onClick={onRemoveCover}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-app opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-surface-2 px-3 py-4 text-center transition-colors hover:border-accent hover:bg-accent-tint/30">
                <ImagePlus className="h-5 w-5 text-muted" />
                <span className="text-[11px] font-semibold text-ink">+ Adicionar Capa personalizada (Opcional)</span>
                <span className="text-[10px] text-faint">Se não enviada, o Instagram usará o 1º frame</span>
                <input type="file" accept="image/jpeg,image/png" onChange={handleCoverUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-surface-2/60 px-3 py-2.5 text-[11px] font-medium text-muted backdrop-blur-sm">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Aviso: Reels são publicados no feed do Instagram e na aba Reels. O vídeo é excluído do servidor temporário após a postagem.
        </p>
      </div>
    </div>
  );
}
