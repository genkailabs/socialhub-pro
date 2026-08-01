'use client';

import { LayoutGrid } from 'lucide-react';
import { STRUCTURES, shapeOf, eligibleStructures } from '@/lib/layouts/structures';
import { canvasSize } from '@/lib/composer-editor';
import { structuresForPieceType } from '@/lib/composer-strategy';
import styles from './VisualComposer.module.css';

// As três funções abaixo consultam o catálogo de estruturas. O painel não as
// usa mais — a lista de estruturas saiu com a geração —, mas elas continuam
// sendo a leitura do catálogo que o motor faz, e é por elas que o teste de
// fiação verifica se as duas listas ainda concordam.

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

/**
 * Seção "Layout": os layouts que a pessoa salvou.
 *
 * O catálogo de estruturas e a lista de estilos saíram junto com a seção
 * "Criar". Os dois só faziam sentido alimentando o motor de geração, que não
 * existe mais no Composer de post: estrutura escolhida sem motor não monta
 * peça nenhuma, e um seletor que não muda nada é pior que nenhum. O que sobra
 * aplica de verdade, no cliente — um layout salvo por você.
 */
export function LayoutsPanel({ busy, onOpenLibrary, onSaveCurrent, canSaveCurrent }) {
  return (
    <>
      <div className={styles.panelBody}>
        <div className={styles.sectionLabel}>LAYOUTS SALVOS</div>
        <p className={styles.fieldHint}>
          Monte a peça no canvas, salve como layout e reaproveite a mesma forma
          nos próximos posts.
        </p>
        <button type="button" className={styles.linkButton} onClick={onOpenLibrary}>
          <LayoutGrid size={13} /> Ver todos os layouts
        </button>
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
