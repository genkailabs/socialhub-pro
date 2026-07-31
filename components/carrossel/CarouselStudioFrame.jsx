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
  studioOrigin
} from '@/lib/carrossel-studio-contract';

const STUDIO_URL = process.env.NEXT_PUBLIC_CARROSSEL_STUDIO_URL || 'http://localhost:3100';
const EMBED_PATH = '/embed-studio';

export function CarouselStudioFrame({
  title,
  brand,
  initialDoc = null,
  initialScript = '',
  templateId,
  slideCount,
  onChange,
  onExport,
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
            script: initialScript
          }),
          allowedOrigin
        );
        return;
      }
      if (!isStudioMessage(data, channelId.current)) return;

      try {
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
          studioErrorMessage({ channelId: channelId.current, code: 'host_save_failed', message }),
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
