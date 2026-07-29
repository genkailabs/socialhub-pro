'use client';

import { useMemo, useState } from 'react';
import { Check, Pencil, Search, Trash2, X } from 'lucide-react';
import { STRUCTURES, structureCard } from '@/lib/layouts/structures';
import styles from './VisualComposer.module.css';

// Miniatura desenhada a partir do próprio layout (§12): os slots da estrutura
// e as camadas do template salvo já trazem posição e tamanho. Um placeholder
// genérico faria todos os cards parecerem iguais.
const BLOCK_TONE = {
  'selo-categoria': 'accent',
  'destaque-palavra': 'accent',
  'divisor': 'accent',
  'imagem-principal': 'media',
  'sobreposicao': 'veil',
  'titulo': 'strong',
  'numero': 'strong'
};

function structureBlocks(structure) {
  return structure.slots.map((slot, index) => ({
    key: `${slot.component}-${index}`,
    x: slot.x * 100,
    y: slot.y * 100,
    w: slot.w * 100,
    h: Math.max(slot.h * 100, 1.6),
    tone: BLOCK_TONE[slot.component] || 'soft'
  }));
}

function templateBlocks(template) {
  const [canvasW, canvasH] = template?.canvas || [430, 430];
  if (!canvasW || !canvasH) return [];
  const blocks = [];
  if (template?.media) blocks.push({ key: 'media', x: 0, y: 0, w: 100, h: 100, tone: 'media' });
  for (const element of template?.elements || []) {
    const layer = element.layer || {};
    blocks.push({
      key: element.id,
      x: (layer.x / canvasW) * 100,
      y: (layer.y / canvasH) * 100,
      w: (layer.w / canvasW) * 100,
      h: Math.max((layer.h / canvasH) * 100, 1.6),
      tone: layer.type === 'text' && (layer.fs || 0) >= 24 ? 'strong' : layer.type === 'text' ? 'soft' : 'accent'
    });
  }
  return blocks;
}

function LayoutThumb({ blocks }) {
  return <span className={styles.libThumb} aria-hidden="true">
    {blocks.map((block) => <span
      key={block.key}
      className={styles[`libBlock_${block.tone}`]}
      style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.w}%`, height: `${block.h}%` }}
    />)}
  </span>;
}

/** Normaliza para busca sem acento — o usuário digita "jornalistico". */
function fold(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function buildLibraryItems(templates = []) {
  const saved = templates.map((template) => ({
    id: `saved:${template.id}`,
    templateId: template.id,
    name: template.name,
    category: template.category || 'Salvos',
    saved: true,
    template,
    blocks: templateBlocks(template.template)
  }));
  const builtin = STRUCTURES.map((structure) => ({
    id: `structure:${structure.id}`,
    structureId: structure.id,
    name: structure.label,
    category: structure.category,
    saved: false,
    blocks: structureBlocks(structure),
    // §11: a ficha vem derivada da própria estrutura, não redigitada aqui.
    card: structureCard(structure)
  }));
  return [...saved, ...builtin];
}

export function LayoutLibrary({
  templates, onClose, onApplyStructure, onApplyTemplate, onRename, onDelete, onSaveCurrent, canSaveCurrent
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('todos');
  const [photoFilter, setPhotoFilter] = useState('todos');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const items = useMemo(() => buildLibraryItems(templates), [templates]);
  const categories = useMemo(
    () => ['todos', ...Array.from(new Set(items.map((item) => item.category))).sort()],
    [items]
  );
  const savedCount = items.filter((item) => item.saved).length;
  const visible = items.filter((item) => {
    if (category !== 'todos' && item.category !== category) return false;
    // §11: filtros de foto e de pessoa. Layout salvo não tem ficha derivada,
    // então some quando o filtro é sobre a ficha — em vez de aparecer sem
    // atender ao que foi pedido.
    if (photoFilter !== 'todos') {
      if (!item.card) return false;
      if (photoFilter === 'com-foto' && !item.card.needsPhoto) return false;
      if (photoFilter === 'sem-foto' && item.card.needsPhoto) return false;
      if (photoFilter === 'com-pessoa' && !item.card.withPerson) return false;
    }
    if (!query.trim()) return true;
    const term = fold(query);
    return fold(item.name).includes(term)
      || fold(item.category).includes(term)
      || fold(item.card?.recommendedFor).includes(term);
  });

  function commitRename(item) {
    const name = renameValue.trim();
    if (name && name !== item.name) onRename(item.templateId, name);
    setRenaming(null);
  }

  return <div className={styles.libraryScrim} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.library} role="dialog" aria-modal="true" aria-labelledby="library-title">
      <div className={styles.libHead}>
        <div>
          <h2 id="library-title">Biblioteca de layouts</h2>
          <p>{items.length} layouts · {savedCount} salvos por você</p>
        </div>
        <div className={styles.libSearch}>
          <Search size={14} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar layout" aria-label="Buscar layout" />
        </div>
        <button type="button" className={styles.iconButton} aria-label="Fechar biblioteca" onClick={onClose}><X size={16} /></button>
      </div>

      <div className={styles.libFilters} role="tablist" aria-label="Categorias de layout">
        {categories.map((item) => <button
          key={item}
          type="button"
          role="tab"
          aria-selected={category === item}
          className={category === item ? styles.libFilterActive : ''}
          onClick={() => setCategory(item)}
        >{item === 'todos' ? 'Todos' : item}</button>)}
      </div>

      {/* §11: filtrar pelo que a peça exige, não só pelo assunto dela. */}
      <div className={styles.libFilters} role="tablist" aria-label="Necessidade de foto">
        {[['todos', 'Qualquer foto'], ['com-foto', 'Precisa de foto'], ['sem-foto', 'Sem foto'], ['com-pessoa', 'Com pessoa']]
          .map(([id, label]) => <button
            key={id}
            type="button"
            role="tab"
            aria-selected={photoFilter === id}
            className={photoFilter === id ? styles.libFilterActive : ''}
            onClick={() => setPhotoFilter(id)}
          >{label}</button>)}
      </div>

      <div className={styles.libGrid}>
        {visible.map((item) => <div key={item.id} className={styles.libCard}>
          <button
            type="button"
            className={styles.libCardApply}
            aria-label={`Aplicar layout ${item.name}`}
            onClick={() => (item.saved ? onApplyTemplate(item.template) : onApplyStructure(item.structureId))}
          >
            <LayoutThumb blocks={item.blocks} />
            {item.saved && <span className={styles.libBadge}>SALVO</span>}
          </button>
          <div className={styles.libCardFoot}>
            {renaming === item.id
              ? <input
                  className={styles.libRename}
                  autoFocus
                  value={renameValue}
                  aria-label={`Novo nome para ${item.name}`}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitRename(item);
                    if (event.key === 'Escape') setRenaming(null);
                  }}
                  onBlur={() => commitRename(item)}
                />
              : <span className={styles.libName} title={item.name}>{item.name}</span>}
            <span className={styles.libCategory}>{item.category}</span>
            {item.saved && renaming !== item.id && <span className={styles.libCardActions}>
              <button type="button" aria-label={`Renomear layout ${item.name}`} onClick={() => { setRenaming(item.id); setRenameValue(item.name); }}><Pencil size={12} /></button>
              <button type="button" aria-label={`Excluir layout ${item.name}`} onClick={() => onDelete(item.templateId)}><Trash2 size={12} /></button>
            </span>}
          </div>
          {/* §11: o que a peça pede e para que serve, no próprio card. Sem
              isso a escolha vira adivinhação a partir de um desenho pequeno. */}
          {item.card && <div className={styles.libCardMeta}>
            <span className={styles.libTags}>
              <em>{item.card.needsPhoto ? 'Precisa de foto' : 'Sem foto'}</em>
              {item.card.withPerson && <em>Com pessoa</em>}
              <em>{{ pouco: 'Pouco texto', medio: 'Texto médio', muito: 'Muito texto' }[item.card.textLevel]}</em>
            </span>
            <small title={item.card.recommendedFor}>{item.card.recommendedFor}</small>
          </div>}
        </div>)}
        {!visible.length && <p className={styles.libEmpty}>Nenhum layout encontrado.</p>}
      </div>

      <div className={styles.libFoot}>
        <span>Aplicar um layout usa o conteúdo escrito no painel Layouts.</span>
        <button
          type="button"
          className={`${styles.button} ${styles.outline}`}
          disabled={!canSaveCurrent}
          title={canSaveCurrent ? undefined : 'Monte algo no canvas para salvar'}
          onClick={onSaveCurrent}
        ><Check size={14} /> Salvar peça atual como layout</button>
      </div>
    </div>
  </div>;
}
