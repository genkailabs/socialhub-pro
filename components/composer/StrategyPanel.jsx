'use client';

import { Sparkles, Wand2, Hand } from 'lucide-react';
import { MODES, OBJECTIVES, pieceTypesForFormat, pieceTypeById } from '@/lib/composer-strategy';
import styles from './VisualComposer.module.css';

const MODE_ICON = { manual: Hand, assistido: Sparkles, automatico: Wand2 };

/**
 * Primeira etapa do fluxo guiado (PRD 01 §3, §4, §5).
 *
 * A ordem da tela é a ordem da decisão: modo → objetivo → tipo de peça. Só
 * depois disso os campos de conteúdo fazem sentido, e é por isso que Estratégia
 * vem antes de Layouts na navegação (§10).
 */
export function StrategyPanel({ format, mode, objective, pieceType, onMode, onObjective, onPieceType }) {
  const tipos = pieceTypesForFormat(format);
  const tipoAtual = pieceTypeById(pieceType);

  return (
    <div className={styles.panelBody}>
      <div className={styles.sectionLabel}>COMO CRIAR</div>
      <div className={styles.chipGrid}>
        {MODES.map((m) => {
          const Icon = MODE_ICON[m.id];
          return (
            <button
              key={m.id}
              type="button"
              title={m.hint}
              className={mode === m.id ? styles.chipActive : styles.chip2}
              onClick={() => onMode(m.id)}
            ><Icon size={13} /> {m.label}</button>
          );
        })}
      </div>
      <p className={styles.fieldHint}>{MODES.find((m) => m.id === mode)?.hint}</p>

      <div className={styles.sectionLabel}>OBJETIVO</div>
      <div className={styles.chipGrid}>
        {OBJECTIVES.map((o) => (
          <button
            key={o.id}
            type="button"
            className={objective === o.id ? styles.chipActive : styles.chip2}
            onClick={() => onObjective(objective === o.id ? '' : o.id)}
          >{o.label}</button>
        ))}
      </div>
      <p className={styles.fieldHint}>
        {objective
          ? 'A IA escreve para este objetivo e o layout inclina para ele.'
          : 'Sem objetivo a IA escreve para engajar, que é o padrão dela.'}
      </p>

      <div className={styles.sectionLabel}>TIPO DE PEÇA</div>
      <div className={styles.chipGrid}>
        {tipos.map((t) => (
          <button
            key={t.id}
            type="button"
            className={pieceType === t.id ? styles.chipActive : styles.chip2}
            onClick={() => onPieceType(pieceType === t.id ? '' : t.id)}
          >{t.label}</button>
        ))}
      </div>
      <p className={styles.fieldHint}>
        {tipoAtual
          ? 'Os campos de conteúdo mostram só o que este tipo usa.'
          : 'Sem tipo, o Composer mostra todos os campos.'}
      </p>
      {/* Honestidade do registro: o tipo existe mas a estrutura própria ainda
          não. Melhor dizer do que entregar uma peça que não é o que promete. */}
      {tipoAtual?.missing && (
        <p className={`${styles.bulletsHint} ${styles.hint_alerta}`} aria-live="polite">
          {tipoAtual.missing} Usando a estrutura mais próxima.
        </p>
      )}
    </div>
  );
}
