'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createBrand } from '@/app/(app)/brand-actions';
import { Button } from '@/components/ui/Button';

const COLORS = ['#6366F1', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export function NewBrandModal({ open, onClose }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!open) { setError(''); setSaving(false); setColor(COLORS[0]); }
  }, [open]);

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set('color', color);
    const res = await createBrand(fd);
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Nova marca</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-app"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Nome *</label>
            <input name="name" autoFocus required placeholder="Ex: Genkai Labs"
              className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Categoria</label>
            <input name="category" placeholder="Ex: Tecnologia"
              className="w-full rounded-xl border border-line bg-app px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Cor</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg ${color === c ? 'ring-2 ring-offset-2 ring-ink' : ''}`}
                  style={{ backgroundColor: c }} aria-label={`cor ${c}`} />
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Criando…' : 'Criar marca'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
