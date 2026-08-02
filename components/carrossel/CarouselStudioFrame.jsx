'use client';

// Ponte com o Carrossel Studio. Ele roda em outra app (Next 16 / React 19 /
// Tailwind 4), então entra por iframe e conversa por postMessage — nada de
// misturar dependência com este projeto. Contrato em docs/CARROSSEL_STUDIO.md.

import { useEffect, useRef, useState } from 'react';
import {
  createStudioChannelId,
  isStudioMessage,
  isStudioReady,
  studioDraftSavedMessage,
  studioErrorMessage,
  studioInitMessage,
  studioMediaDeleteAckMessage,
  studioMediaMessage,
  studioOrigin
} from '@/lib/carrossel-studio-contract';

const STUDIO_URL = process.env.NEXT_PUBLIC_CARROSSEL_STUDIO_URL || 'http://localhost:3100';
const EMBED_PATH = '/embed-studio';

export function CarouselStudioFrame({
  title,
  brandId,
  brand,
  initialDoc = null,
  initialScript = '',
  initialMedia = [],
  templateId,
  slideCount,
  onChange,
  onExport,
  onMediaUpload,
  onMediaDelete,
  onSelection,
  onDraftSaved,
  onError,
  onClose,
  height = '100%'
}) {
  const frameRef = useRef(null);
  const channelId = useRef(createStudioChannelId());
  const [status, setStatus] = useState('loading');
  const allowedOrigin = studioOrigin(STUDIO_URL);

  useEffect(() => {
    async function handleMessage(event) {
      if (!allowedOrigin || event.origin !== allowedOrigin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;

      if (isStudioReady(data)) {
        setStatus('ready');
        frameRef.current?.contentWindow?.postMessage(
          studioInitMessage({
            channelId: channelId.current,
            title,
            doc: initialDoc,
            brand,
            templateId,
            slideCount,
            script: initialScript,
            initialMedia
          }),
          allowedOrigin
        );
        return;
      }
      if (!isStudioMessage(data, channelId.current)) return;

      try {
        if (data.type === 'cs:selection') {
          onSelection?.({
            slideIndex: data.slideIndex,
            elementType: data.elementType,
            slot: typeof data.slot === 'number' ? data.slot : null
          });
          return;
        }
        if (data.type === 'cs:media-delete-request') {
          if (!brandId || !data.path.startsWith(`temp/${brandId}/`)) throw new Error('Caminho temporário inválido para esta marca.');
          if (!onMediaDelete) throw new Error('Remoção de mídia indisponível no host.');
          const removed = await onMediaDelete(data.path);
          if (!removed?.ok) throw new Error(removed?.error || 'Não foi possível remover o arquivo temporário.');
          frameRef.current?.contentWindow?.postMessage(
            studioMediaDeleteAckMessage({ channelId: channelId.current, requestId: data.requestId, path: data.path }),
            allowedOrigin
          );
          return;
        }
        if (data.type === 'cs:media-request') {
          if (!onMediaUpload) throw new Error('Upload de mídia indisponível no host.');
          const file = new File([data.file.bytes], data.file.name, { type: data.file.type });
          const item = await onMediaUpload(file);
          if (!item?.url) throw new Error('O upload não devolveu uma URL válida.');
          frameRef.current?.contentWindow?.postMessage(
            studioMediaMessage({ channelId: channelId.current, requestId: data.requestId, item }),
            allowedOrigin
          );
          return;
        }
        if (data.type === 'cs:change') {
          const saved = await onChange?.(data.doc);
          if (saved?.draftId) {
            frameRef.current?.contentWindow?.postMessage(
              studioDraftSavedMessage({ channelId: channelId.current, draftId: saved.draftId }),
              allowedOrigin
            );
            onDraftSaved?.(saved.draftId);
          }
          return;
        }
        if (data.type === 'cs:export') return onExport?.(data.images, data.doc);
        if (data.type === 'cs:close') return onClose?.();
        if (data.type === 'cs:error') return onError?.(data.message);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.';
        onError?.(message);
        frameRef.current?.contentWindow?.postMessage(
          studioErrorMessage({
            channelId: channelId.current,
            code: data.type === 'cs:media-request' ? 'host_upload_failed' : data.type === 'cs:media-delete-request' ? 'host_delete_failed' : 'host_save_failed',
            message,
            requestId: ['cs:media-request', 'cs:media-delete-request'].includes(data.type) ? data.requestId : undefined
          }),
          allowedOrigin
        );
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // o init roda uma vez por montagem: recarregar o iframe é o jeito de resetar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full">
      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted">
          Abrindo o Studio…
        </div>
      )}
      <iframe
        ref={frameRef}
        title="Carrossel Studio"
        src={allowedOrigin ? `${STUDIO_URL}${EMBED_PATH}` : 'about:blank'}
        style={{ width: '100%', height, border: 0, display: 'block' }}
        allow="clipboard-write"
      />
    </div>
  );
}
