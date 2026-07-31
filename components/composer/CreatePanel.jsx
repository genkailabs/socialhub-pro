'use client';

import { Grid2x2, Hand, LayoutTemplate, Sparkles, Wand2 } from 'lucide-react';
import { MODES, OBJECTIVES, pieceTypesForFormat, pieceTypeById, fieldsForPieceType } from '@/lib/composer-strategy';
import { bulletsHint } from '@/lib/layouts/bullets-hint';
import styles from './VisualComposer.module.css';

const MODE_ICON = { manual: Hand, ia: Wand2 };

export const EMPTY_FIELDS = { title: '', subtitle: '', bullets: '', cta: '', highlight: '', source: '', date: '' };

// A legenda costuma ser o único texto que já existe quando o usuário abre o
// painel. A primeira linha vira título e a segunda, apoio — é a leitura que
// qualquer pessoa faria, e continua totalmente editável nos campos.
export function fieldsFromCaption(caption = '') {
  const lines = String(caption || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return { ...EMPTY_FIELDS, title: lines[0].slice(0, 90), subtitle: (lines[1] || '').slice(0, 160) };
}

/**
 * Seção "Criar" (§4 da reorg): um fluxo curto de três etapas.
 *
 * Antes isto era dois painéis. "Estratégia" pedia modo, objetivo e tipo; e
 * "Layouts" pedia o conteúdo, a estrutura, o estilo E disparava a geração — com
 * todas as opções abertas ao mesmo tempo, antes de existir qualquer peça. A
 * ordem aqui é a ordem da decisão, e o que só faz sentido DEPOIS de gerar (qual
 * estrutura saiu, por quê, trocar) só aparece depois de gerar.
 */
export function CreatePanel({
  format, mode, objective, pieceType, caption, fields, onFields,
  onMode, onObjective, onPieceType, structureId = '',
  busy, error, result, mascot = [], issues = [], onGenerate, onOpenLayouts
}) {
  const tipos = pieceTypesForFormat(format);
  const tipoAtual = pieceTypeById(pieceType);
  const campos = fieldsForPieceType(pieceType);
  const usa = (field) => campos.includes(field);
  const captionFields = fieldsFromCaption(caption);
  const usesAi = MODES.find((m) => m.id === mode)?.usesAi;
  // A estrutura vem junto: sem ela `bulletsHint` só sabe dizer o efeito
  // automático dos itens e perde o aviso de quem fixou uma estrutura à mão
  // ("Lista precisa de 3 itens — você tem 1"). A estrutura passou a ser
  // escolhida no painel Layout, então precisa chegar aqui por prop.
  const itemsHint = bulletsHint({ text: fields.bullets, format, structureId });

  return (
    <div className={styles.panelBody}>
      <div className={styles.stepLabel}><span>1</span> CONTEÚDO</div>

      <label className={styles.fieldLabel} htmlFor="create-title">
        {usesAi ? 'Tema' : 'Título'}
      </label>
      <input
        id="create-title"
        className={styles.field}
        value={fields.title}
        maxLength={90}
        onChange={(e) => onFields({ title: e.target.value })}
        placeholder={usesAi ? 'Sobre o que a IA deve escrever' : 'Do que o post fala'}
      />

      <label className={styles.fieldLabel} htmlFor="create-objective">Objetivo</label>
      <select
        id="create-objective"
        className={styles.field}
        value={objective}
        onChange={(e) => onObjective(e.target.value)}
      >
        <option value="">Sem objetivo definido</option>
        {OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>

      <label className={styles.fieldLabel} htmlFor="create-piece">Tipo de peça</label>
      <select
        id="create-piece"
        className={styles.field}
        value={pieceType}
        onChange={(e) => onPieceType(e.target.value)}
      >
        <option value="">Sem tipo definido</option>
        {tipos.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <p className={styles.fieldHint}>
        {tipoAtual
          ? 'Os campos e as estruturas ficam só os que este tipo usa.'
          : 'Sem tipo, o Composer mostra todos os campos e todas as estruturas.'}
      </p>
      {/* Honestidade do registro: o tipo existe mas a estrutura própria ainda
          não. Melhor dizer do que entregar uma peça que não é o que promete. */}
      {tipoAtual?.missing && (
        <p className={`${styles.bulletsHint} ${styles.hint_alerta}`} aria-live="polite">
          {tipoAtual.missing} Usando a estrutura mais próxima.
        </p>
      )}

      {/* No modo Manual os campos da peça são o conteúdo; no modo Com IA são a
          descrição opcional, porque a IA vai reescrever tudo isso. */}
      <details className={styles.details} open={!usesAi}>
        <summary>{usesAi ? 'Descrição (opcional)' : 'Campos da peça'}</summary>
        {usa('subtitle') && <>
          <label className={styles.fieldLabel} htmlFor="create-subtitle">Subtítulo</label>
          <input id="create-subtitle" className={styles.field} value={fields.subtitle} maxLength={160} onChange={(e) => onFields({ subtitle: e.target.value })} placeholder="Uma linha de apoio" />
        </>}
        {usa('bullets') && <>
          <label className={styles.fieldLabel} htmlFor="create-bullets">Itens <span className={styles.fieldHint}>um por linha</span></label>
          <textarea id="create-bullets" className={`${styles.textarea} ${styles.textareaShort}`} value={fields.bullets} onChange={(e) => onFields({ bullets: e.target.value })} placeholder="Um item por linha" />
          <p className={`${styles.bulletsHint} ${styles[`hint_${itemsHint.tone}`]}`} aria-live="polite">{itemsHint.message}</p>
        </>}
        {usa('highlight') && <>
          <label className={styles.fieldLabel} htmlFor="create-highlight">Destaque <span className={styles.fieldHint}>uma palavra do título</span></label>
          <input id="create-highlight" className={styles.field} value={fields.highlight || ''} maxLength={28} onChange={(e) => onFields({ highlight: e.target.value })} placeholder="Em branco, o Hub escolhe" />
        </>}
        {usa('source') && <>
          <label className={styles.fieldLabel} htmlFor="create-source">Fonte <span className={styles.fieldHint}>quem publicou</span></label>
          <input id="create-source" className={styles.field} value={fields.source || ''} maxLength={48} onChange={(e) => onFields({ source: e.target.value })} placeholder="Ex.: Agência Brasil" />
        </>}
        {usa('date') && <>
          <label className={styles.fieldLabel} htmlFor="create-date">Data</label>
          <input id="create-date" className={styles.field} value={fields.date || ''} maxLength={24} onChange={(e) => onFields({ date: e.target.value })} placeholder="Ex.: 29 jul 2026" />
        </>}
        {usa('cta') && <>
          <label className={styles.fieldLabel} htmlFor="create-cta">Chamada para ação</label>
          <input id="create-cta" className={styles.field} value={fields.cta} maxLength={32} onChange={(e) => onFields({ cta: e.target.value })} placeholder="Ex.: leia a reportagem completa" />
        </>}
        {captionFields && <button type="button" className={styles.linkButton} onClick={() => onFields({ ...EMPTY_FIELDS, ...captionFields })}>Preencher com a legenda</button>}
      </details>

      <div className={styles.stepLabel}><span>2</span> CRIAÇÃO</div>
      <div className={styles.chipGrid}>
        {MODES.map((m) => {
          const Icon = MODE_ICON[m.id];
          return <button
            key={m.id}
            type="button"
            title={m.hint}
            className={mode === m.id ? styles.chipActive : styles.chip2}
            onClick={() => onMode(m.id)}
          ><Icon size={13} /> {m.label}</button>;
        })}
      </div>
      <button
        type="button"
        className={`${styles.button} ${styles.primary} ${styles.generateButton}`}
        disabled={Boolean(busy)}
        onClick={() => onGenerate(usesAi ? 'ai' : 'content')}
      >
        {usesAi ? <Wand2 size={15} /> : <Grid2x2 size={15} />}
        {busy ? 'Montando…' : usesAi ? 'Escrever com IA e montar' : 'Montar com meu conteúdo'}
      </button>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {/* Etapa 3 só existe depois que existe peça. Mostrar "estrutura escolhida"
          antes de gerar era prometer decisão que ainda não foi tomada. */}
      {result && <>
        <div className={styles.stepLabel}><span>3</span> RESULTADO</div>
        <div className={styles.resultCard}>
          <strong>{result.structureLabel}</strong>
          <span>Estilo {result.styleLabel} · conteúdo do tipo {result.contentType}</span>
          {result.slides > 1 && <span>{result.slides} slides</span>}
        </div>
        {mascot.map((line) => <div className={styles.check} key={line}><Sparkles size={13} />{line}</div>)}
        <button type="button" className={`${styles.button} ${styles.outline}`} style={{ width: '100%' }} onClick={onOpenLayouts}>
          <LayoutTemplate size={14} /> Trocar o layout
        </button>
      </>}

      {issues.length > 0 && <>
        <div className={styles.sectionLabel}>AINDA PRECISA DE VOCÊ</div>
        {issues.map((issue) => (
          <div className={styles.error} key={`${issue.id}-${issue.message}`}>{issue.message} {issue.fix}</div>
        ))}
      </>}
    </div>
  );
}
