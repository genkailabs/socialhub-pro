'use client';

import { useState } from 'react';
import {
  Smartphone, Film, X, AlertCircle, Type, AlignLeft, AlignCenter, AlignRight,
  MoveVertical, MoveHorizontal, Link2, ExternalLink
} from 'lucide-react';
import { Section, FieldLabel, Note, InlineAlert, fieldClass, dropzoneClass } from './ComposerSection';

export function StoryForm({
  media = [],
  onAddMedia,
  onRemoveMedia,
  storyOverlay = {},
  onStoryOverlayChange
}) {
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const currentMedia = media[0];

  const overlay = {
    text: storyOverlay?.text || '',
    align: storyOverlay?.align || 'center',
    size: storyOverlay?.size || 'md',
    vertical: storyOverlay?.vertical || 'center',
    horizontal: storyOverlay?.horizontal || 'center',
    ctaText: storyOverlay?.ctaText || '',
    ctaUrl: storyOverlay?.ctaUrl || ''
  };

  function updateOverlay(updates) {
    onStoryOverlayChange?.({ ...overlay, ...updates });
  }

  function handleFilesInput(fileList) {
    setError(null);
    const file = fileList?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Formato não suportado. Envie uma imagem (JPG/PNG) ou vídeo vertical (MP4/MOV).');
      return;
    }

    if (isVideo && file.size > 60 * 1024 * 1024) {
      setError('O vídeo excede o tamanho máximo permitido para Story (60MB / 60s).');
      return;
    }

    onAddMedia([file]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFilesInput(e.dataTransfer?.files);
  }

  return (
    <div className="space-y-4">
      <Section
        step="1"
        title="Mídia do Story (9:16)"
        hint="Uma foto ou vídeo vertical no formato 9:16. Desaparece em 24h no Instagram."
      >
        {error && (
          <div className="mb-4">
            <InlineAlert type="err">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="min-w-0">{error}</span>
            </InlineAlert>
          </div>
        )}

        {currentMedia ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="group relative w-32">
              {currentMedia.isVideo ? (
                <div className="flex h-56 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 p-3 text-center shadow-soft">
                  <Film className="h-8 w-8 text-accent" aria-hidden="true" />
                  <span className="line-clamp-2 break-all text-[10px] font-semibold text-ink">{currentMedia.file?.name || 'Vídeo de Story'}</span>
                </div>
              ) : (
                <img
                  src={currentMedia.url}
                  alt="Mídia do Story"
                  className="h-56 w-32 rounded-xl border border-line object-cover shadow-soft"
                />
              )}
              <button
                type="button"
                onClick={() => { setError(null); onRemoveMedia(0); }}
                aria-label="Remover mídia do Story"
                className="absolute -right-2 -top-2 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-ink text-app shadow-soft transition-colors duration-200 hover:bg-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 text-xs">
              <p className="truncate font-bold text-ink">{currentMedia.file?.name || 'Arquivo do Story'}</p>
              <p className="font-mono text-[11px] text-muted">
                {currentMedia.isVideo ? 'Vídeo (MP4/MOV)' : 'Imagem (JPG/PNG)'} • Proporção 9:16 recomendada
              </p>
              {currentMedia.file && (
                <p className="font-mono text-[11px] text-faint">
                  {(currentMedia.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`${dropzoneClass} ${dragging ? 'border-accent bg-accent-tint/50' : ''}`}
          >
            <Smartphone className="h-6 w-6 text-muted" aria-hidden="true" />
            <span className="text-xs font-bold text-ink">Clique para enviar foto ou vídeo do Story</span>
            <span className="font-mono text-[11px] text-faint">Vertical 9:16 · JPG, PNG, MP4 ou MOV até 60s</span>
            <input
              type="file"
              accept="image/png, image/jpeg, video/mp4, video/quicktime"
              onChange={(e) => handleFilesInput(e.target.files)}
              className="hidden"
            />
          </label>
        )}
      </Section>

      {/* Editor de Texto Visual sobre a mídia (Overlay Editor) */}
      <Section
        step="2"
        title="Editor Visual sobre a Mídia (Overlay)"
        hint="O texto é posicionado visualmente sobre o Story dentro da área segura visualizada ao lado."
      >
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="story-overlay-text">
              <Type className="h-3.5 w-3.5" /> Texto sobreposto no Story
            </FieldLabel>
            <textarea
              id="story-overlay-text"
              value={overlay.text}
              onChange={(e) => updateOverlay({ text: e.target.value })}
              rows={3}
              placeholder="Escreva algo curto e impactante para aparecer sobre o Story…"
              className={`${fieldClass} resize-y leading-relaxed`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Alinhamento do Texto */}
            <div>
              <FieldLabel>Alinhamento</FieldLabel>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 border border-line">
                {[
                  { id: 'left', icon: AlignLeft, label: 'Esq' },
                  { id: 'center', icon: AlignCenter, label: 'Centro' },
                  { id: 'right', icon: AlignRight, label: 'Dir' }
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateOverlay({ align: id })}
                    aria-pressed={overlay.align === id}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      overlay.align === id
                        ? 'bg-surface text-accent shadow-soft'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tamanho da Fonte */}
            <div>
              <FieldLabel>Tamanho</FieldLabel>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 border border-line">
                {[
                  { id: 'sm', label: 'Pequeno' },
                  { id: 'md', label: 'Médio' },
                  { id: 'lg', label: 'Grande' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateOverlay({ size: id })}
                    aria-pressed={overlay.size === id}
                    className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-bold transition-all ${
                      overlay.size === id
                        ? 'bg-surface text-accent shadow-soft'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Posição Vertical */}
            <div>
              <FieldLabel>
                <MoveVertical className="h-3.5 w-3.5" /> Posição Vertical
              </FieldLabel>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 border border-line">
                {[
                  { id: 'top', label: 'Topo' },
                  { id: 'center', label: 'Centro' },
                  { id: 'bottom', label: 'Base' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateOverlay({ vertical: id })}
                    aria-pressed={overlay.vertical === id}
                    className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-bold transition-all ${
                      overlay.vertical === id
                        ? 'bg-surface text-accent shadow-soft'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Posição Horizontal */}
          <div>
            <FieldLabel>
              <MoveHorizontal className="h-3.5 w-3.5" /> Posição Horizontal na Área Segura
            </FieldLabel>
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              {[
                { id: 'left', label: 'À Esquerda' },
                { id: 'center', label: 'Ao Centro' },
                { id: 'right', label: 'À Direita' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateOverlay({ horizontal: id })}
                  aria-pressed={overlay.horizontal === id}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                    overlay.horizontal === id
                      ? 'border-accent bg-accent-tint text-accent-ink shadow-soft'
                      : 'border-line bg-surface-2/60 text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA e Link */}
          <div className="border-t border-line pt-4 space-y-3">
            <FieldLabel>
              <ExternalLink className="h-3.5 w-3.5" /> CTA Visual e Link de Referência
            </FieldLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="story-cta-text" hint="ex: Saiba mais">Texto do CTA / Botão</FieldLabel>
                <input
                  id="story-cta-text"
                  value={overlay.ctaText}
                  onChange={(e) => updateOverlay({ ctaText: e.target.value })}
                  placeholder="Saiba mais"
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="story-cta-url" hint="URL ou link">Link</FieldLabel>
                <div className="relative flex items-center">
                  <Link2 className="absolute left-3 h-4 w-4 text-muted" />
                  <input
                    id="story-cta-url"
                    value={overlay.ctaUrl}
                    onChange={(e) => updateOverlay({ ctaUrl: e.target.value })}
                    placeholder="https://suamarca.com.br/promo"
                    className={`${fieldClass} pl-9 font-mono text-xs`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Note>
        Stories não utilizam legenda de feed principal, hashtags ou comentários abertos. Vídeos e fotos de Stories são temporários, expiram em 24h no ar, e elementos interativos como enquetes só podem ser adicionados no app do Instagram.
      </Note>
    </div>
  );
}
