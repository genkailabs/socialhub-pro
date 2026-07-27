'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Grid2x2, LayoutGrid, Sparkles, Wand2 } from 'lucide-react';
import { STRUCTURES } from '@/lib/layouts/structures';
import { VISUAL_STYLES } from '@/lib/layouts/styles';
import styles from './VisualComposer.module.css';

export const EMPTY_FIELDS = { title: '', subtitle: '', bullets: '', cta: '' };

// Swatch por estilo (§5 do handoff). Cor só de identificação na lista — a
// paleta real da peça continua vindo do Brand Kit e do estilo.
const STYLE_SWATCH = {
  editorial: '#8b7bd6',
  jornalistico: '#e0483c',
  tecnologia: '#3ccfb0',
  minimalista: '#c9cfd8',
  corporativo: '#6ea8fe',
  premium: '#c9a227',
  acolhedor: '#f0a03c',
  comercial: '#f05c5c'
};

// A legenda costuma ser o único texto que já existe quando o usuário abre o
// painel. A primeira linha vira título e a segunda, apoio — é a leitura que
// qualquer pessoa faria, e continua totalmente editável nos campos.
export function fieldsFromCaption(caption = '') {
  const lines = String(caption || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return { title: lines[0].slice(0, 90), subtitle: (lines[1] || '').slice(0, 160), bullets: '', cta: '' };
}

/** Estruturas oferecidas na escolha manual, filtradas pelo formato aberto. */
export function manualStructures(format) {
  const shape = format === 'story' || format === 'reel' ? 'story' : 'square';
  return STRUCTURES.filter((structure) => structure.shapes.includes(shape));
}

export function LayoutsPanel({
  format, caption, fields, onFields, structureId, onStructure, styleId, onStyle,
  busy, mascot = [], issues = [], error = '',
  onGenerate, onOpenLibrary, onSaveCurrent, canSaveCurrent
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const captionFields = fieldsFromCaption(caption);
  const structures = manualStructures(format);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  function choose(mode) {
    setMenuOpen(false);
    onGenerate(mode);
  }

  return (
    <>
      <div className={styles.panelBody}>
        <div className={styles.sectionLabel}>CONTEÚDO</div>
        <label className={styles.fieldLabel} htmlFor="layout-title">Título</label>
        <input
          id="layout-title"
          className={styles.field}
          value={fields.title}
          maxLength={90}
          onChange={(e) => onFields({ title: e.target.value })}
          placeholder="Do que o post fala"
        />
        <label className={styles.fieldLabel} htmlFor="layout-subtitle">Subtítulo</label>
        <input
          id="layout-subtitle"
          className={styles.field}
          value={fields.subtitle}
          maxLength={160}
          onChange={(e) => onFields({ subtitle: e.target.value })}
          placeholder="Uma linha de apoio"
        />
        <label className={styles.fieldLabel} htmlFor="layout-bullets">
          Lista ou dados <span className={styles.fieldHint}>1 item por linha</span>
        </label>
        <textarea
          id="layout-bullets"
          className={`${styles.textarea} ${styles.textareaShort}`}
          value={fields.bullets}
          onChange={(e) => onFields({ bullets: e.target.value })}
          placeholder="Vira lista, comparação ou carrossel"
        />
        <label className={styles.fieldLabel} htmlFor="layout-cta">Chamada para ação</label>
        <input
          id="layout-cta"
          className={styles.field}
          value={fields.cta}
          maxLength={32}
          onChange={(e) => onFields({ cta: e.target.value })}
          placeholder="Ex.: leia a reportagem completa"
        />
        {captionFields && <button
          type="button"
          className={styles.linkButton}
          onClick={() => onFields({ ...EMPTY_FIELDS, ...captionFields })}
        >Preencher com a legenda</button>}

        <div className={styles.sectionLabel}>ESTRUTURA</div>
        <div className={styles.segment}>
          <button
            type="button"
            className={structureId ? '' : styles.selected}
            onClick={() => onStructure('')}
          ><Sparkles size={13} /> A IA escolhe</button>
          <button
            type="button"
            className={structureId ? styles.selected : ''}
            onClick={() => onStructure(structures[0]?.id || '')}
          >Manual</button>
        </div>
        {structureId
          ? <div className={styles.chipGrid}>
              {structures.map((structure) => <button
                key={structure.id}
                type="button"
                className={structureId === structure.id ? styles.chipActive : styles.chip2}
                onClick={() => onStructure(structure.id)}
              >{structure.label}</button>)}
            </div>
          : <p className={styles.panelHintText}>
              A IA lê o seu conteúdo e escolhe entre manchete, lista, comparação ou citação.
            </p>}

        <div className={styles.sectionLabel}>ESTILO VISUAL</div>
        <div className={styles.styleList}>
          <button
            type="button"
            className={styleId ? styles.styleItem : `${styles.styleItem} ${styles.styleItemActive}`}
            onClick={() => onStyle('')}
          ><span className={styles.styleSwatch} style={{ background: 'var(--vc-accent)' }} />A IA escolhe</button>
          {VISUAL_STYLES.map((style) => <button
            key={style.id}
            type="button"
            className={styleId === style.id ? `${styles.styleItem} ${styles.styleItemActive}` : styles.styleItem}
            onClick={() => onStyle(style.id)}
          >
            <span className={styles.styleSwatch} style={{ background: STYLE_SWATCH[style.id] || 'var(--vc-faint)' }} />
            {style.label}
          </button>)}
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        {mascot.length > 0 && <>
          <div className={styles.sectionLabel}>O QUE EU FIZ</div>
          {mascot.map((line) => <div className={styles.check} key={line}><Sparkles size={13} />{line}</div>)}
        </>}

        {issues.length > 0 && <>
          <div className={styles.sectionLabel}>AINDA PRECISA DE VOCÊ</div>
          {issues.map((issue) => (
            <div className={styles.error} key={`${issue.id}-${issue.message}`}>{issue.message} {issue.fix}</div>
          ))}
        </>}
      </div>

      <div className={styles.panelFooter} ref={menuRef}>
        {menuOpen && <div className={styles.genMenu} role="menu" aria-label="Como montar a arte">
          <button type="button" role="menuitem" onClick={() => choose('content')}>
            <Grid2x2 size={16} />
            <span><strong>Montar com o conteúdo atual</strong><em>Usa o texto que você escreveu</em></span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose('ai')}>
            <Wand2 size={16} />
            <span><strong>Escrever o conteúdo e montar</strong><em>A IA redige a partir do tema</em></span>
          </button>
        </div>}
        <button
          type="button"
          className={`${styles.button} ${styles.primary} ${styles.generateButton}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={Boolean(busy)}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Sparkles size={16} /> {busy ? 'Gerando…' : 'Gerar arte'} <ChevronUp size={15} className={menuOpen ? styles.caretOpen : ''} />
        </button>
        <div className={styles.panelFooterLinks}>
          <button type="button" className={styles.linkButton} onClick={onOpenLibrary}>
            <LayoutGrid size={13} /> Biblioteca de layouts
          </button>
          <button
            type="button"
            className={styles.linkButtonMuted}
            disabled={!canSaveCurrent}
            onClick={onSaveCurrent}
          >Salvar como layout</button>
        </div>
      </div>
    </>
  );
}
