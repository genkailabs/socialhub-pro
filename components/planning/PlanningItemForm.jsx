'use client';

import { useEffect, useState } from 'react';
import { History, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const EMPTY_VALUES = {
  date: '', title: '', topic: '', format: 'image', pillar: '', objective: '',
  summary: '', hook: '', cta: '', target_audience: '', estimated_duration: '', suggested_time: ''
};

const INPUT_CLASS = 'mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-accent';

export function PlanningItemForm({ item, onCancel, onSave, onRestoreVersion, busy }) {
  const [values, setValues] = useState({ ...EMPTY_VALUES, ...(item || {}) });
  const [versionId, setVersionId] = useState('');

  useEffect(() => {
    setValues({ ...EMPTY_VALUES, ...(item || {}) });
    setVersionId('');
  }, [item]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSave(values);
  }

  const versions = item?.versions || [];
  return (
    <form onSubmit={submit} className="rounded-2xl border border-accent/25 bg-accent/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-sm font-bold text-ink">{item?.id ? 'Editar ideia' : 'Adicionar ideia'}</h3><p className="mt-0.5 text-xs text-muted">Edição manual não usa IA.</p></div>
        <button type="button" aria-label="Fechar formulário" onClick={onCancel} className="rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-ink">Data<input required type="date" value={values.date || ''} onChange={(e) => update('date', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">HorÃ¡rio sugerido<input type="time" value={values.suggested_time || ''} onChange={(e) => update('suggested_time', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">Formato<select value={values.format || 'image'} onChange={(e) => update('format', e.target.value)} className={INPUT_CLASS}><option value="image">Imagem</option><option value="carousel">Carrossel</option><option value="reel">Reel</option><option value="stories">Stories</option></select></label>
        <label className="text-xs font-semibold text-ink md:col-span-2">Título<input required value={values.title || ''} onChange={(e) => update('title', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">Tema<input value={values.topic || ''} onChange={(e) => update('topic', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">Pilar<input value={values.pillar || ''} onChange={(e) => update('pillar', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">Objetivo<input value={values.objective || ''} onChange={(e) => update('objective', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">Duração estimada<input value={values.estimated_duration || ''} onChange={(e) => update('estimated_duration', e.target.value)} className={INPUT_CLASS} placeholder="Ex.: 30 segundos" /></label>
        <label className="text-xs font-semibold text-ink md:col-span-2">Resumo<textarea value={values.summary || ''} onChange={(e) => update('summary', e.target.value)} className={INPUT_CLASS} rows="2" /></label>
        <label className="text-xs font-semibold text-ink">Gancho<input value={values.hook || ''} onChange={(e) => update('hook', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink">CTA<input value={values.cta || ''} onChange={(e) => update('cta', e.target.value)} className={INPUT_CLASS} /></label>
        <label className="text-xs font-semibold text-ink md:col-span-2">Público<input value={values.target_audience || ''} onChange={(e) => update('target_audience', e.target.value)} className={INPUT_CLASS} /></label>
      </div>

      {versions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl bg-surface p-3">
          <label className="flex-1 text-xs font-semibold text-ink">Restaurar versão<select value={versionId} onChange={(e) => setVersionId(e.target.value)} className={INPUT_CLASS}><option value="">Selecione uma versão</option>{versions.map((version) => <option key={version.id} value={version.id}>Versão {version.version_number}</option>)}</select></label>
          <Button type="button" variant="ghost" size="sm" disabled={!versionId || busy} onClick={() => onRestoreVersion(versionId)}><History className="h-3.5 w-3.5" aria-hidden="true" />Restaurar</Button>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}><Save className="h-4 w-4" aria-hidden="true" />{busy ? 'Salvando...' : 'Salvar ideia'}</Button></div>
    </form>
  );
}
