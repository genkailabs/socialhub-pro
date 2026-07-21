'use client';

import { useState } from 'react';
import { Smartphone, Film, X, AlertCircle } from 'lucide-react';

export function StoryComposer({ media = [], onAddFiles, onRemove }) {
  const currentMedia = media[0];
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      setError('Formato não suportado. Envie uma imagem (JPG/PNG) ou vídeo (MP4/MOV).');
      return;
    }

    if (isVideo && file.size > 60 * 1024 * 1024) {
      setError('O vídeo excede o tamanho máximo de 60MB.');
      return;
    }

    onAddFiles([file]);
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {currentMedia ? (
        <div className="group relative w-32">
          {currentMedia.isVideo ? (
            <div className="flex h-48 w-32 flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 border border-line p-2 text-center shadow-soft">
               <Film className="h-8 w-8 text-accent" />
               <span className="text-[10px] font-semibold text-ink line-clamp-2 break-all">{currentMedia.file.name}</span>
            </div>
          ) : (
            <img 
              src={currentMedia.url} 
              alt="Story" 
              className="h-48 w-32 rounded-xl border border-line object-cover shadow-soft" 
            />
          )}
          <button 
            type="button" 
            onClick={() => { setError(null); onRemove(); }}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-app shadow-soft transition-transform hover:scale-110"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-8 text-center transition-colors hover:border-accent/50 hover:bg-accent-tint/40">
          <Smartphone className="h-6 w-6 text-muted" />
          <div className="space-y-0.5">
            <span className="block text-xs font-bold text-ink">Clique para enviar foto ou vídeo para o Story</span>
            <span className="block text-[11px] text-faint">Formato vertical 9:16 recomendado · JPG, PNG, MP4, MOV até 60s</span>
          </div>
          <input 
            type="file" 
            accept="image/png, image/jpeg, video/mp4, video/quicktime" 
            onChange={handleFileChange} 
            className="hidden" 
          />
        </label>
      )}
      
      <div className="flex gap-2 rounded-lg bg-accent-tint/30 p-2 text-[11px] text-accent backdrop-blur-md">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p>Aviso: Vídeos para Stories ficam em armazenamento temporário e são excluídos automaticamente após a publicação.</p>
      </div>
    </div>
  );
}
