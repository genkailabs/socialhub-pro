'use client';

import { useMemo, useState } from 'react';
import { Check, Pencil, Search, Trash2, X } from 'lucide-react';
import styles from './VisualComposer.module.css';
// A miniatura é desenhada a partir do próprio layout (§12). O desenho mora em
// lib/layouts/thumb.js porque a Biblioteca criativa (rota /biblioteca) usa o
// mesmo — dois desenhos diferentes para o mesmo layout confundiriam mais do
// que ajudariam.
import { templateBlocks } from '@/lib/layouts/thumb';

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

/**
 * Só os layouts salvos pela pessoa.
 *
 * O catálogo de estruturas saía daqui direto para o motor de geração, que foi
 * removido do Composer de post junto com a seção "Criar". Sem motor, clicar
 * numa estrutura do catálogo não montava nada — então ela não é oferecida.
 * Layout salvo continua: ele é aplicado no cliente, sem servidor.
 */
export function buildLibraryItems(templates = []) {
  return templates.map((template) => ({
    id: `saved:${template.id}`,
    templateId: template.id,
    name: template.name,
    category: template.category || 'Salvos',
    saved: true,
    template,
    blocks: templateBlocks(template.template)
  }));
}

export function LayoutLibrary({
  templates, onClose, onApplyTemplate, onRename, onDelete, onSaveCurrent, canSaveCurrent
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('todos');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const items = useMemo(() => buildLibraryItems(templates), [templates]);
  const categories = useMemo(
    () => ['todos', ...Array.from(new Set(items.map((item) => item.category))).sort()],
    [items]
  );
  const visible = items.filter((item) => {
    if (category !== 'todos' && item.category !== category) return false;
    if (!query.trim()) return true;
    const term = fold(query);
    return fold(item.name).includes(term) || fold(item.category).includes(term);
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
          <p>{items.length} {items.length === 1 ? 'layout salvo' : 'layouts salvos'} por você</p>
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

      {/* O filtro de "precisa de foto / com pessoa" lia a ficha da estrutura
          do catálogo. Sem catálogo não há ficha, e um filtro que esconde tudo
          é pior que filtro nenhum. */}

      <div className={styles.libGrid}>
        {visible.map((item) => <div key={item.id} className={styles.libCard}>
          <button
            type="button"
            className={styles.libCardApply}
            aria-label={`Aplicar layout ${item.name}`}
            onClick={() => onApplyTemplate(item.template)}
          >
            <LayoutThumb blocks={item.blocks} />
            <span className={styles.libBadge}>SALVO</span>
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
            {renaming !== item.id && <span className={styles.libCardActions}>
              <button type="button" aria-label={`Renomear layout ${item.name}`} onClick={() => { setRenaming(item.id); setRenameValue(item.name); }}><Pencil size={12} /></button>
              <button type="button" aria-label={`Excluir layout ${item.name}`} onClick={() => onDelete(item.templateId)}><Trash2 size={12} /></button>
            </span>}
          </div>
        </div>)}
        {!visible.length && <p className={styles.libEmpty}>
          {items.length ? 'Nenhum layout encontrado.' : 'Você ainda não salvou nenhum layout. Monte uma peça no canvas e salve aqui.'}
        </p>}
      </div>

      <div className={styles.libFoot}>
        <span>Aplicar um layout reaproveita a forma e usa a legenda como texto.</span>
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
