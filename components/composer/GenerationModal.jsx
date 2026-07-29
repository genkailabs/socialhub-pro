'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, LayoutGrid, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import styles from './VisualComposer.module.css';

// O que a geração faz, em ordem. É descrição do trabalho, não medição dele: o
// backend não emite progresso, então não há etapa "concluída" para marcar.
//
// Antes essas seis linhas avançavam por um timer de 900ms e uma barra subia até
// 83%. O número não vinha de lugar nenhum — era encenação, e uma geração lenta
// ficava parada em "Posicionando os elementos" como se algo tivesse travado.
export const GENERATION_STEPS = [
  'Analisando o conteúdo',
  'Escolhendo o layout',
  'Aplicando o Brand Kit',
  'Posicionando os elementos'
];

export function GenerationProgressModal({ subtitle, onCancel }) {
  return <div className={styles.modalScrim}>
    <div className={styles.genModal} role="dialog" aria-modal="true" aria-labelledby="gen-title" aria-busy="true">
      <div className={styles.genHead}>
        <span className={styles.genBadge}><Sparkles size={18} /></span>
        <div>
          <h2 id="gen-title">Gerando sua arte</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {/* Barra indeterminada: diz "está trabalhando", não "está em X%". */}
      <div className={`${styles.genTrack} ${styles.genTrackBusy}`}><span /></div>
      <div className={styles.genMeta}>
        <span><LoaderCircle size={13} className={styles.genSpin} aria-hidden="true" /> Trabalhando</span>
        <span>Sem previsão exata</span>
      </div>
      <ul className={styles.genSteps}>
        {GENERATION_STEPS.map((label) => (
          <li key={label} className={styles.gen_idle}><span className={styles.genDot} aria-hidden="true" /><span>{label}</span></li>
        ))}
      </ul>
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
