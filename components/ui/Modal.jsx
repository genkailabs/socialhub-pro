'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo em cima da página. Existe porque formulário renderizado no fluxo abria
 * fora da tela: quem clicava em "Editar" num card do fim do quadro não via nada
 * acontecer.
 *
 * Fecha no Esc e no clique do fundo, prende o foco enquanto está aberto e trava
 * a rolagem de trás para o formulário não brigar com a página.
 */
export function Modal({ open, onClose, labelledBy, children, className = '' }) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => { if (onClose) onClose(); }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    returnFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener('keydown', onKeyDown);
    // O primeiro campo recebe o foco: quem abriu com o teclado já começa a digitar.
    const timer = setTimeout(() => {
      const focusables = panelRef.current?.querySelectorAll(FOCUSABLE);
      (focusables?.[0] || panelRef.current)?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    };
  }, [open, close]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 sm:items-center sm:p-6">
      <div aria-hidden="true" onClick={close} className="animate-modal-backdrop fixed inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`animate-modal-panel relative my-auto w-full max-w-2xl rounded-2xl border border-line bg-surface shadow-modal outline-none ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
