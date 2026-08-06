'use client';

// Ponte com o Carrossel Studio. Ele roda em outra app (Next 16 / React 19 /
// Tailwind 4), então entra por iframe e conversa por postMessage — nada de
// misturar dependência com este projeto. Contrato em docs/CARROSSEL_STUDIO.md.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createStudioChannelId,
  isStudioMessage,
  isStudioReady,
  studioDraftSavedMessage,
  studioErrorMessage,
  studioImageHintsMessage,
  studioInitMessage,
  studioMediaDeleteAckMessage,
  studioMediaMessage,
  studioOrigin,
  studioThemeMessage
} from '@/lib/carrossel-studio-contract';

/** Tema do Hub agora, lido de onde ele mora: a classe no <html>. */
function currentTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const STUDIO_URL = process.env.NEXT_PUBLIC_CARROSSEL_STUDIO_URL || 'http://localhost:3100';
const EMBED_PATH = '/embed-studio';

export function CarouselStudioFrame({
  title,
  brandId,
  brand,
  initialDoc = null,
  initialScript = '',
  initialMedia = [],
  imageHints = [],
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
  // As dicas de foto mudam quando o roteiro muda, e o init roda uma vez por
  // montagem: guardar a versão atual aqui evita reenviar o init inteiro (que
  // recarregaria o documento) só para atualizar um texto de apoio.
  const hintsRef = useRef(imageHints);

  // O init é montado em dois lugares — na resposta ao `cs:ready` e no `onLoad`
  // do iframe —, então ele vive numa função só. Enviar duas vezes é seguro: o
  // Studio ignora o segundo init depois de já ter carregado o documento.
  const enviarInit = useCallback(() => {
    if (!allowedOrigin) return;
    frameRef.current?.contentWindow?.postMessage(
      studioInitMessage({
        channelId: channelId.current,
        title,
        doc: initialDoc,
        brand,
        templateId,
        slideCount,
        script: initialScript,
        initialMedia,
        imageHints: hintsRef.current,
        theme: currentTheme()
      }),
      allowedOrigin
    );
    setStatus('ready');
    // As props do documento inicial valem para esta montagem; recarregar o
    // iframe é o jeito de trocar de documento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedOrigin]);

  // Roteiro novo, dicas novas: o painel Mídia do Studio se atualiza sozinho.
  useEffect(() => {
    hintsRef.current = imageHints;
    if (!allowedOrigin || status !== 'ready') return;
    frameRef.current?.contentWindow?.postMessage(
      studioImageHintsMessage({ channelId: channelId.current, hints: imageHints }),
      allowedOrigin
    );
  }, [imageHints, allowedOrigin, status]);

  useEffect(() => {
    async function handleMessage(event) {
      if (!allowedOrigin || event.origin !== allowedOrigin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;

      if (isStudioReady(data)) {
        enviarInit();
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

    // O Hub troca de tema mexendo na classe do <html> — sem recarregar nada.
    // Observar a classe é o único jeito de o iframe saber, e não acopla este
    // componente ao botão de tema: qualquer caminho que troque o tema avisa.
    const observer = new MutationObserver(() => {
      if (!channelId.current || !allowedOrigin) return;
      frameRef.current?.contentWindow?.postMessage(
        studioThemeMessage({ channelId: channelId.current, theme: currentTheme() }),
        allowedOrigin
      );
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('message', handleMessage);
    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
    };
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
        // Segunda defesa do handshake: se o `cs:ready` do Studio se perdeu por
        // ter sido anunciado antes de este componente escutar, o init sai
        // assim mesmo quando o iframe termina de carregar. Enviar duas vezes é
        // seguro — o Studio ignora o segundo init depois de carregar o doc.
        onLoad={enviarInit}
        allow="clipboard-write"
      />
    </div>
  );
}
