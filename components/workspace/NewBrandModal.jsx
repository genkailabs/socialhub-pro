'use client';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { createBrand } from '@/app/(app)/brand-actions';
import { Button } from '@/components/ui/Button';
import { BrandBadge } from '@/components/workspace/BrandBadge';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export function NewBrandModal({ open, onClose }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) { setError(''); setSaving(false); setColor(COLORS[0]); setName(''); }
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

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <BrandBadge name={name || '?'} color={color} size={36} />
          <div className="flex-1">
            <h2 className="text-base font-extrabold">Nova marca</h2>
            <p className="text-xs text-muted">Cada marca isola posts, conexões e métricas.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Nome *</label>
            <input name="name" autoFocus required placeholder="Ex: Genkai Labs" value={name}
              onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink">Categoria</label>
            <input name="category" placeholder="Ex: Tecnologia" className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Cor</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`grid h-8 w-8 place-items-center rounded-lg transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink' : ''}`}
                  style={{ backgroundColor: c }} aria-label={`cor ${c}`}>
                  {color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Criando…' : 'Criar marca'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
