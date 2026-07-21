'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, Trash2 } from 'lucide-react';
import { switchBrand } from '@/app/(app)/brand-actions';
import { BrandBadge } from '@/components/workspace/BrandBadge';
import { NewBrandModal } from '@/components/workspace/NewBrandModal';
import { DeleteBrandModal } from '@/components/workspace/DeleteBrandModal';

export function BrandSwitcher({ brands = [], activeId }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const ref = useRef(null);
  const active = brands.find((b) => b.id === activeId) || brands[0] || null;

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-bold text-ink transition-colors hover:border-accent/40">
        {active ? <BrandBadge name={active.name} color={active.color} /> : <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[9px] font-extrabold text-app">—</span>}
        {active ? active.name : 'Nenhuma marca'}
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="animate-pop absolute left-0 top-full z-40 mt-1.5 w-60 rounded-xl glass p-1.5 shadow-lift">
          {brands.length === 0 && <p className="px-2.5 py-2 text-xs text-muted">Nenhuma marca ainda.</p>}
          {brands.map((b) => (
            <div key={b.id} className="group flex items-center rounded-lg hover:bg-surface-2">
              <button
                onClick={async () => { setOpen(false); await switchBrand(b.id); }}
                className="flex flex-1 items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold text-ink">
                <BrandBadge name={b.name} color={b.color} />
                <span className="flex-1 truncate">{b.name}</span>
                {b.id === active?.id && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); setDeleteTarget(b); }}
                aria-label={`Excluir ${b.name}`}
                className="mr-1.5 rounded-md p-1.5 text-faint opacity-0 transition-colors hover:bg-danger/10 hover:text-danger group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="my-1 h-px bg-line" />
          <button onClick={() => { setOpen(false); setModal(true); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-accent transition-colors hover:bg-accent-tint">
            <Plus className="h-3.5 w-3.5" /> Nova marca
          </button>
        </div>
      )}

      <NewBrandModal open={modal} onClose={() => setModal(false)} />
      <DeleteBrandModal brand={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
