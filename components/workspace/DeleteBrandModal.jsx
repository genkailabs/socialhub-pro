'use client';
import { useState, useEffect } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { deleteBrand } from '@/app/(app)/brand-actions';
import { Button } from '@/components/ui/Button';
import { BrandBadge } from '@/components/workspace/BrandBadge';

export function DeleteBrandModal({ brand, onClose }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    if (brand) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [brand, onClose]);

  if (!brand) return null;

  async function onConfirm() {
    setError('');
    setSaving(true);
    const res = await deleteBrand(brand.id);
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    onClose();
  }

  return (
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-md rounded-2xl glass p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <BrandBadge name={brand.name} color={brand.color} size={36} />
          <div className="flex-1">
            <h2 className="text-base font-extrabold">Excluir {brand.name}?</h2>
            <p className="text-xs text-muted">Isso apaga posts, conexões e métricas dessa marca.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Ação não pode ser desfeita. Todo o histórico desta marca some.</span>
        </div>

        {error && <p className="mb-3 text-xs font-semibold text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={onConfirm} disabled={saving}
            className="bg-danger text-white shadow-md shadow-danger/25 hover:bg-danger/90">
            {saving ? 'Excluindo…' : 'Excluir marca'}
          </Button>
        </div>
      </div>
    </div>
  );
}
