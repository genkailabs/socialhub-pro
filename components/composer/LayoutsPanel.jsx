'use client';

import { LayoutGrid, Sparkles } from 'lucide-react';
import {
  STRUCTURES, shapeOf, structureCard, eligibleStructures, structureById
} from '@/lib/layouts/structures';
import { VISUAL_STYLES } from '@/lib/layouts/styles';
import { canvasSize } from '@/lib/composer-editor';
import { structuresForPieceType } from '@/lib/composer-strategy';
import styles from './VisualComposer.module.css';

// Reexportados daqui porque o Composer e os testes já importavam por este
// caminho quando os campos moravam neste painel. O dono deles agora é o
// CreatePanel — a peça é escrita lá.
export { EMPTY_FIELDS, fieldsFromCaption } from './CreatePanel';

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

const TEXT_LEVEL_LABEL = { pouco: 'pouco texto', medio: 'texto médio', muito: 'muito texto' };

// Quantas estruturas entram em "recomendadas". Acima disso já é catálogo, e
// catálogo tem lugar próprio (a Biblioteca).
const MAX_RECOMENDADAS = 5;

/**
 * Estruturas oferecidas na escolha manual, filtradas pela peça aberta.
 *
 * A proporção entra junto com o formato (§1.5): derivar a forma só do formato
 * dizia "square" para um post 4:5 e "story" para qualquer coisa vertical, então
 * a lista manual divergia da lista que o motor considera elegível.
 */
export function manualStructures(format, ratio = '1:1') {
  const [width, height] = canvasSize(format, ratio);
  const shape = shapeOf({ width, height });
  return STRUCTURES.filter((structure) => structure.shapes.includes(shape));
}

/**
 * §5: com tipo de peça escolhido, só as estruturas que o tipo aceita.
 * Sem tipo, o catálogo inteiro do formato — é o comportamento de antes.
 */
export function structuresFor(format, pieceType, ratio = '1:1') {
  const doFormato = manualStructures(format, ratio);
  const permitidas = structuresForPieceType(pieceType);
  if (!permitidas.length) return doFormato;
  const filtradas = doFormato.filter((structure) => permitidas.includes(structure.id));
  // Tipo cujas estruturas não servem a este formato (ex.: capa de Reel num
  // post): melhor oferecer o catálogo do formato que uma lista vazia.
  return filtradas.length ? filtradas : doFormato;
}

/**
 * As poucas estruturas que servem ao conteúdo que existe agora (§5 da reorg).
 *
 * Mostrar as 27 de uma vez é o mesmo que não recomendar nenhuma. Aqui vale o
 * que o motor considera ELEGÍVEL para este conteúdo — a mesma regra da escolha
 * automática, para a lista não contradizer o que o Hub faria sozinho.
 */
export function recommendedStructures({ format, ratio, pieceType, content }) {
  const doTipo = structuresFor(format, pieceType, ratio);
  const [width, height] = canvasSize(format, ratio);
  const elegiveis = new Set(eligibleStructures(content || {}, shapeOf({ width, height })).map((s) => s.id));
  const cabem = doTipo.filter((structure) => elegiveis.has(structure.id));
  // Conteúdo ainda vazio não elege quase nada: aí a recomendação é o começo do
  // catálogo do tipo, que já é uma lista curta e coerente.
  return (cabem.length ? cabem : doTipo).slice(0, MAX_RECOMENDADAS);
}

function StructureCard({ structure, active, onSelect }) {
  const card = structureCard(structure);
  return <button
    type="button"
    className={`${styles.layoutCard} ${active ? styles.layoutCardActive : ''}`}
    onClick={() => onSelect(structure.id)}
  >
    {/* Miniatura desenhada dos próprios slots: nada de imagem de catálogo que
        envelhece separada da estrutura. */}
    <span className={styles.layoutThumb} aria-hidden="true">
      {structure.slots.filter((slot) => slot.component !== 'sobreposicao').slice(0, 7).map((slot, index) => <span
        key={`${slot.component}-${index}`}
        className={slot.component === 'imagem-principal' ? styles.thumbMedia : styles.thumbBlock}
        style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, width: `${slot.w * 100}%`, height: `${Math.max(0.02, slot.h) * 100}%` }}
      />)}
    </span>
    <span className={styles.layoutCardBody}>
      <strong>{card.label}</strong>
      <em>{card.recommendedFor}</em>
      <span className={styles.layoutTags}>
        <span className={card.needsPhoto ? styles.tagOn : styles.tag}>{card.needsPhoto ? 'precisa de foto' : 'sem foto'}</span>
        <span className={styles.tag}>{TEXT_LEVEL_LABEL[card.textLevel]}</span>
        {card.withPerson && <span className={styles.tag}>pessoa</span>}
      </span>
    </span>
  </button>;
}

/**
 * Seção "Layout" (§5 da reorg): estrutura primeiro, estilo depois.
 *
 * O painel antigo misturava campos de texto, estrutura e estilo na mesma
 * coluna. Aqui só existe a FORMA — o conteúdo é escrito em "Criar".
 */
export function LayoutsPanel({
  format, ratio = '1:1', pieceType = '', content = {},
  structureId, onStructure, styleId, onStyle,
  busy, error = '', onOpenLibrary, onSaveCurrent, canSaveCurrent
}) {
  const recomendadas = recommendedStructures({ format, ratio, pieceType, content });
  // A estrutura fixada pela pessoa entra na lista mesmo fora da recomendação:
  // some dali seria esconder a escolha dela.
  const fixada = structureId && !recomendadas.some((s) => s.id === structureId) ? structureById(structureId) : null;
  const lista = fixada ? [fixada, ...recomendadas] : recomendadas;

  return (
    <>
      <div className={styles.panelBody}>
        <div className={styles.sectionLabel}>ESTRUTURAS RECOMENDADAS</div>
        <button
          type="button"
          className={`${styles.layoutAuto} ${structureId ? '' : styles.layoutCardActive}`}
          onClick={() => onStructure('')}
        ><Sparkles size={14} /> Escolher por mim
          <em>O Hub lê o conteúdo e decide entre as {lista.length} abaixo.</em>
        </button>
        <div className={styles.layoutList}>
          {lista.map((structure) => <StructureCard
            key={structure.id}
            structure={structure}
            active={structureId === structure.id}
            onSelect={onStructure}
          />)}
        </div>
        <button type="button" className={styles.linkButton} onClick={onOpenLibrary}>
          <LayoutGrid size={13} /> Ver todos os layouts
        </button>

        {/* Estilo DEPOIS da estrutura: escolher a roupa antes do corpo era
            parte da mistura que deixava a tela confusa. */}
        <div className={styles.sectionLabel}>ESTILO VISUAL</div>
        <div className={styles.styleList}>
          <button
            type="button"
            className={styleId ? styles.styleItem : `${styles.styleItem} ${styles.styleItemActive}`}
            onClick={() => onStyle('')}
          ><span className={styles.styleSwatch} style={{ background: 'var(--vc-accent)' }} />Escolher por mim</button>
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
      </div>

      <div className={styles.panelFooter}>
        <button
          type="button"
          className={styles.linkButtonMuted}
          disabled={!canSaveCurrent || Boolean(busy)}
          onClick={onSaveCurrent}
        >Salvar a peça atual como layout</button>
      </div>
    </>
  );
}
