'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, BringToFront,
  Bold, Copy, Crop, Highlighter, Image as ImageIcon, Lock, Maximize, Move, Replace,
  SendToBack, Trash2, Type, Unlock
} from 'lucide-react';
import { FONT_LIBRARY } from '@/lib/composer-fonts';
import styles from './VisualComposer.module.css';

// Alinhamentos relativos ao canvas (§9). São os únicos que fazem sentido com
// uma seleção só; distribuição entre vários elementos exige multisseleção, que
// o editor ainda não tem — por isso não vira botão morto aqui.
export const ALIGNMENTS = [
  ['left', 'Esquerda'], ['center-h', 'Centro'], ['right', 'Direita'],
  ['top', 'Topo'], ['center-v', 'Meio'], ['bottom', 'Base']
];

const TEXT_ALIGNMENTS = [
  ['left', AlignLeft, 'Alinhar à esquerda'],
  ['center', AlignCenter, 'Centralizar'],
  ['right', AlignRight, 'Alinhar à direita']
];

function ToolButton({ label, disabled, active, onClick, children }) {
  return <button
    type="button"
    className={`${styles.tbButton} ${active ? styles.tbButtonOn : ''}`}
    title={label}
    aria-label={label}
    aria-pressed={active === undefined ? undefined : Boolean(active)}
    disabled={disabled}
    onClick={onClick}
  >{children}</button>;
}

/**
 * Controles do texto selecionado, na barra e não num painel (§3).
 *
 * Fonte, corpo, peso, alinhamento, cor, destaque e espaçamento são as sete
 * coisas que se ajusta o tempo todo; abrir uma lateral inteira para mudar o
 * tamanho de uma palavra era o que fazia a tela parecer embolada.
 */
function TextControls({ layer, onPatch, onHistory }) {
  const patch = (value, history = true) => onPatch(value, history);
  return <>
    <select
      className={styles.tbSelect}
      aria-label="Fonte"
      value={layer.font || 'Poppins'}
      onChange={(event) => patch({ font: event.target.value })}
    >
      {FONT_LIBRARY.map((font) => <option key={font.id} value={font.family}>{font.family}</option>)}
    </select>
    <input
      type="number"
      className={styles.tbNumber}
      aria-label="Tamanho do texto"
      min={8}
      max={200}
      value={Math.round(layer.fs || 16)}
      onFocus={onHistory}
      onChange={(event) => patch({ fs: Number(event.target.value) || 16 }, false)}
    />
    <ToolButton
      label="Negrito"
      active={(layer.weight || 400) >= 700}
      onClick={() => patch({ weight: (layer.weight || 400) >= 700 ? 400 : 800 })}
    ><Bold size={15} /></ToolButton>
    {TEXT_ALIGNMENTS.map(([value, Icon, label]) => <ToolButton
      key={value}
      label={label}
      active={(layer.align || 'left') === value}
      onClick={() => patch({ align: value })}
    ><Icon size={15} /></ToolButton>)}
    <label className={styles.tbColor} title="Cor do texto">
      <span className={styles.tbSwatch} style={{ background: layer.color }} />
      <input
        type="color"
        aria-label="Cor do texto"
        value={/^#[0-9a-f]{6}$/i.test(layer.color || '') ? layer.color : '#111111'}
        onFocus={onHistory}
        onChange={(event) => patch({ color: event.target.value }, false)}
      />
    </label>
    <ToolButton
      label="Destacar com bloco de cor"
      active={layer.bgMode === 'box'}
      onClick={() => patch({ bgMode: layer.bgMode === 'box' ? 'none' : 'box' })}
    ><Highlighter size={15} /></ToolButton>
    <input
      type="number"
      className={styles.tbNumber}
      aria-label="Espaçamento entre letras"
      min={-5}
      max={20}
      step={0.5}
      value={Number(layer.ls || 0)}
      onFocus={onHistory}
      onChange={(event) => patch({ ls: Number(event.target.value) || 0 }, false)}
    />
  </>;
}

/** Controles da foto: recortar, ajustar, reposicionar, opacidade, substituir. */
function MediaControls({ media, onFitCover, onFitContain, onReposition, onOpacity, onReplace, repositioning }) {
  return <>
    <span className={styles.tbSelection}><ImageIcon size={13} />{media.name || 'Foto'}</span>
    <ToolButton label="Preencher o quadro" onClick={onFitCover}><Crop size={15} /></ToolButton>
    <ToolButton label="Mostrar a foto inteira" onClick={onFitContain}><Maximize size={15} /></ToolButton>
    <ToolButton label="Reposicionar dentro do quadro" active={repositioning} onClick={onReposition}><Move size={15} /></ToolButton>
    <label className={styles.tbRange} title="Opacidade">
      <input
        type="range"
        aria-label="Opacidade da foto"
        min={20}
        max={100}
        value={Math.round((media.op ?? 1) * 100)}
        onChange={(event) => onOpacity(Number(event.target.value) / 100)}
      />
    </label>
    <button type="button" className={styles.tbTextButton} onClick={onReplace}><Replace size={13} /> Substituir</button>
  </>;
}

export function CanvasToolbar({
  selection, onDuplicate, onAlign, onToggleLock, onBringToFront, onSendToBack, onDelete,
  onPatch, onHistory, mediaSelected = null, mediaActions = null
}) {
  const [alignOpen, setAlignOpen] = useState(false);
  const alignRef = useRef(null);
  // Sem seleção o grupo de elemento fica inteiro desabilitado (§9 do handoff).
  const layer = selection?.layer || null;
  const hasLayer = Boolean(layer);
  const locked = Boolean(layer?.locked);
  const isText = hasLayer && (layer.type === 'text' || layer.type === 'button');

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

  // Nada selecionado: a barra some em vez de mostrar uma fileira de botões
  // cinzas. Espaço vazio informa menos que ausência.
  if (!hasLayer && !mediaSelected) {
    return <div className={styles.canvasToolbar} role="toolbar" aria-label="Ferramentas do canvas">
      <span className={styles.tbHint}>Selecione um elemento para editar</span>
    </div>;
  }

  return <div className={styles.canvasToolbar} role="toolbar" aria-label="Ferramentas do canvas">
    {mediaSelected && !hasLayer
      ? <MediaControls media={mediaSelected} {...mediaActions} />
      : <>
        {isText && <>
          <TextControls layer={layer} onPatch={onPatch} onHistory={onHistory} />
          <span className={styles.tbDivider} />
        </>}
        <div className={styles.tbGroup}>
          <ToolButton label="Duplicar" onClick={onDuplicate}><Copy size={16} /></ToolButton>
          <span className={styles.tbAlignWrap} ref={alignRef}>
            <ToolButton label="Alinhar" onClick={() => setAlignOpen((open) => !open)}>
              <AlignHorizontalJustifyCenter size={16} />
            </ToolButton>
            {alignOpen && <div className={styles.tbPopover} role="menu" aria-label="Alinhar elemento">
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
            onClick={onToggleLock}
          >{locked ? <Lock size={16} /> : <Unlock size={16} />}</ToolButton>
          <ToolButton label="Trazer para frente" onClick={onBringToFront}><BringToFront size={16} /></ToolButton>
          <ToolButton label="Enviar para trás" onClick={onSendToBack}><SendToBack size={16} /></ToolButton>
          <ToolButton label="Excluir" disabled={locked} onClick={onDelete}><Trash2 size={16} /></ToolButton>
        </div>
        <span className={styles.tbSpacer} />
        {selection?.label && <span className={styles.tbSelection}><Type size={13} />{selection.label}</span>}
      </>}
  </div>;
}

export function alignedPosition(layer, [canvasW, canvasH], mode) {
  if (mode === 'left') return { x: 0 };
  if (mode === 'right') return { x: Math.round(canvasW - layer.w) };
  if (mode === 'center-h') return { x: Math.round((canvasW - layer.w) / 2) };
  if (mode === 'top') return { y: 0 };
  if (mode === 'bottom') return { y: Math.round(canvasH - layer.h) };
  if (mode === 'center-v') return { y: Math.round((canvasH - layer.h) / 2) };
  return {};
}
