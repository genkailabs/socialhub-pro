'use client';

import { useState } from 'react';
import { Smartphone, Film, X, AlertCircle } from 'lucide-react';
import { Note, InlineAlert, dropzoneClass } from './ComposerSection';

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
    <div className="space-y-3">
      {error && (
        <InlineAlert type="err">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0">{error}</span>
        </InlineAlert>
      )}

      {currentMedia ? (
        <div className="group relative w-32">
          {currentMedia.isVideo ? (
            <div className="flex h-48 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 p-2 text-center shadow-soft">
              <Film className="h-8 w-8 text-accent" aria-hidden="true" />
              <span className="line-clamp-2 break-all text-[10px] font-semibold text-ink">{currentMedia.file.name}</span>
            </div>
          ) : (
            <img
              src={currentMedia.url}
              alt="Mídia do Story"
              className="h-48 w-32 rounded-xl border border-line object-cover shadow-soft"
            />
          )}
          <button
            type="button"
            onClick={() => { setError(null); onRemove(); }}
            aria-label="Remover mídia do Story"
            className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ink text-app shadow-soft transition-colors duration-200 hover:bg-danger"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className={dropzoneClass}>
          <Smartphone className="h-5 w-5 text-muted" aria-hidden="true" />
          <span className="text-xs font-bold text-ink">Clique para enviar foto ou vídeo</span>
          <span className="text-[11px] text-faint">Vertical 9:16 · JPG, PNG, MP4 ou MOV até 60s</span>
          <input
            type="file"
            accept="image/png, image/jpeg, video/mp4, video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}

      <Note>Vídeos de Story ficam em armazenamento temporário e são excluídos após a publicação.</Note>
    </div>
  );
}
