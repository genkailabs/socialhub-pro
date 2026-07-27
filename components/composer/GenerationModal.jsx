'use client';

import { useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, LayoutGrid, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import styles from './VisualComposer.module.css';

// As seis etapas do handoff (§10). O backend não emite progresso, então elas
// são encenação visual do estado da operação — nunca resultado inventado: a
// última só fecha quando a resposta real chega (§7 do PRD).
export const GENERATION_STEPS = [
  'Analisando o conteúdo',
  'Escolhendo o layout',
  'Preparando imagens',
  'Aplicando o Brand Kit',
  'Posicionando os elementos',
  'Finalizando a arte'
];

// Enquanto a resposta não volta, o indicador para na penúltima etapa. Mostrar
// 100% antes de existir arte seria mentir para o usuário.
export const GENERATION_STALL_STEP = GENERATION_STEPS.length - 2;

export function generationProgress(step) {
  return Math.round(((step + 1) / GENERATION_STEPS.length) * 100);
}

export function GenerationProgressModal({ step, subtitle, onCancel }) {
  const percent = generationProgress(step);
  return <div className={styles.modalScrim}>
    <div className={styles.genModal} role="dialog" aria-modal="true" aria-labelledby="gen-title" aria-busy="true">
      <div className={styles.genHead}>
        <span className={styles.genBadge}><Sparkles size={18} /></span>
        <div>
          <h2 id="gen-title">Gerando sua arte</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={styles.genTrack}><span style={{ width: `${percent}%` }} /></div>
      <div className={styles.genMeta}><span>{percent}% concluído</span><span>Sem previsão exata</span></div>
      <ol className={styles.genSteps}>
        {GENERATION_STEPS.map((label, index) => {
          const state = index < step ? 'done' : index === step ? 'active' : 'idle';
          return <li key={label} className={styles[`gen_${state}`]}>
            {state === 'done'
              ? <Check size={15} aria-hidden="true" />
              : state === 'active'
                ? <LoaderCircle size={15} className={styles.genSpin} aria-hidden="true" />
                : <span className={styles.genDot} aria-hidden="true" />}
            <span>{label}</span>
          </li>;
        })}
      </ol>
      <div className={styles.modalActions}>
        <button type="button" className={`${styles.button} ${styles.outline}`} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  </div>;
}

export function GenerationErrorModal({ message, detail, onRetry, onLibrary, onClose }) {
  const [open, setOpen] = useState(false);
  return <div className={styles.modalScrim} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.genModal} role="alertdialog" aria-modal="true" aria-labelledby="gen-error-title">
      <div className={styles.genHead}>
        <span className={`${styles.genBadge} ${styles.genBadgeError}`}><AlertCircle size={19} /></span>
        <div>
          <h2 id="gen-error-title">{message}</h2>
          <p>Seu conteúdo continua salvo. Tente novamente ou escolha um layout da biblioteca.</p>
        </div>
      </div>
      <div className={styles.modalActions}>
        <button type="button" className={`${styles.button} ${styles.outline}`} onClick={onLibrary}>
          <LayoutGrid size={14} /> Escolher layout
        </button>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onRetry}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
      {detail && <>
        <button type="button" className={styles.genDisclosure} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          Ver detalhes técnicos {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {open && <pre className={styles.genDetail}>{detail}</pre>}
      </>}
    </div>
  </div>;
}
