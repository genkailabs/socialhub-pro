'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignHorizontalJustifyCenter, BringToFront, Copy, Lock, Minus, Plus, Redo2,
  SendToBack, Trash2, Type, Undo2, Unlock
} from 'lucide-react';
import styles from './VisualComposer.module.css';

// Alinhamentos relativos ao canvas (§9). São os únicos que fazem sentido com
// uma seleção só; distribuição entre vários elementos exige multisseleção, que
// o editor ainda não tem — por isso não vira botão morto aqui.
export const ALIGNMENTS = [
  ['left', 'Esquerda'], ['center-h', 'Centro'], ['right', 'Direita'],
  ['top', 'Topo'], ['center-v', 'Meio'], ['bottom', 'Base']
];

export function alignedPosition(layer, [canvasW, canvasH], mode) {
  if (mode === 'left') return { x: 0 };
  if (mode === 'right') return { x: Math.round(canvasW - layer.w) };
  if (mode === 'center-h') return { x: Math.round((canvasW - layer.w) / 2) };
  if (mode === 'top') return { y: 0 };
  if (mode === 'bottom') return { y: Math.round(canvasH - layer.h) };
  if (mode === 'center-v') return { y: Math.round((canvasH - layer.h) / 2) };
  return {};
}

function ToolButton({ label, disabled, onClick, children }) {
  return <button
    type="button"
    className={styles.tbButton}
    title={label}
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >{children}</button>;
}

export function CanvasToolbar({
  canUndo, canRedo, onUndo, onRedo,
  zoomPercent, onZoomIn, onZoomOut, onZoomFit,
  selection, onDuplicate, onAlign, onToggleLock, onBringToFront, onSendToBack, onDelete
}) {
  const [alignOpen, setAlignOpen] = useState(false);
  const alignRef = useRef(null);
  // Sem seleção o grupo de elemento fica inteiro desabilitado (§9 do handoff).
  const hasLayer = Boolean(selection?.layer);
  const locked = Boolean(selection?.layer?.locked);

  useEffect(() => {
    if (!alignOpen) return undefined;
    const close = (event) => {
      if (!alignRef.current?.contains(event.target)) setAlignOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [alignOpen]);

  useEffect(() => {
    if (!hasLayer) setAlignOpen(false);
  }, [hasLayer]);

  return <div className={styles.canvasToolbar} role="toolbar" aria-label="Ferramentas do canvas">
    <div className={styles.tbGroup}>
      <ToolButton label="Desfazer" disabled={!canUndo} onClick={onUndo}><Undo2 size={16} /></ToolButton>
      <ToolButton label="Refazer" disabled={!canRedo} onClick={onRedo}><Redo2 size={16} /></ToolButton>
    </div>
    <span className={styles.tbDivider} />
    <div className={styles.tbGroup}>
      <ToolButton label="Reduzir zoom" onClick={onZoomOut}><Minus size={16} /></ToolButton>
      <span className={styles.tbZoom} data-testid="canvas-zoom">{zoomPercent}%</span>
      <ToolButton label="Aumentar zoom" onClick={onZoomIn}><Plus size={16} /></ToolButton>
      <button type="button" className={styles.tbTextButton} onClick={onZoomFit}>Ajustar</button>
    </div>
    <span className={styles.tbDivider} />
    <div className={`${styles.tbGroup} ${hasLayer ? '' : styles.tbDisabled}`}>
      <ToolButton label="Duplicar" disabled={!hasLayer} onClick={onDuplicate}><Copy size={16} /></ToolButton>
      <span className={styles.tbAlignWrap} ref={alignRef}>
        <ToolButton label="Alinhar" disabled={!hasLayer} onClick={() => setAlignOpen((open) => !open)}>
          <AlignHorizontalJustifyCenter size={16} />
        </ToolButton>
        {alignOpen && hasLayer && <div className={styles.tbPopover} role="menu" aria-label="Alinhar elemento">
          {ALIGNMENTS.map(([mode, label]) => <button
            key={mode}
            type="button"
            role="menuitem"
            onClick={() => { onAlign(mode); setAlignOpen(false); }}
          >{label}</button>)}
        </div>}
      </span>
      <ToolButton
        label={locked ? 'Desbloquear' : 'Bloquear'}
        disabled={!hasLayer}
        onClick={onToggleLock}
      >{locked ? <Lock size={16} /> : <Unlock size={16} />}</ToolButton>
      <ToolButton label="Trazer para frente" disabled={!hasLayer} onClick={onBringToFront}><BringToFront size={16} /></ToolButton>
      <ToolButton label="Enviar para trás" disabled={!hasLayer} onClick={onSendToBack}><SendToBack size={16} /></ToolButton>
      <ToolButton label="Excluir" disabled={!hasLayer || locked} onClick={onDelete}><Trash2 size={16} /></ToolButton>
    </div>
    <span className={styles.tbSpacer} />
    {selection?.label
      ? <span className={styles.tbSelection}><Type size={13} />{selection.label}</span>
      : <span className={styles.tbHint}>Selecione um elemento para editar</span>}
  </div>;
}
