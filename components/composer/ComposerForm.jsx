'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { publishNow, schedulePost } from '@/lib/posts-actions';
import { Button } from '@/components/ui/Button';

async function uploadImage(brandId, file) {
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${brandId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export function ComposerForm({ brandId }) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('now'); // 'now' | 'schedule'
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function onPick(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
    setMsg(null);
  }

  async function onSubmit() {
    if (!file) { setMsg({ type: 'err', text: 'Escolha uma imagem.' }); return; }
    if (mode === 'schedule' && !when) { setMsg({ type: 'err', text: 'Escolha data e hora.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const imageUrl = await uploadImage(brandId, file);
      const res = mode === 'now'
        ? await publishNow({ brandId, caption, imageUrl })
        : await schedulePost({ brandId, caption, imageUrl, scheduledAt: new Date(when).toISOString() });
      if (res?.error) throw new Error(res.error);
      setMsg({ type: 'ok', text: mode === 'now' ? 'Publicado no Instagram! 🎉' : 'Post agendado! ⏰' });
      setCaption(''); setFile(null); setPreview(null); setWhen('');
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-ink">Legenda</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
          placeholder="Escreva a legenda do post…"
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-ink">Imagem</label>
        <input type="file" accept="image/*" onChange={onPick}
          className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
      </div>

      {preview && <img src={preview} alt="prévia" className="max-h-64 rounded-xl border border-line object-contain" />}

      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('now')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === 'now' ? 'bg-accent text-white' : 'bg-app text-ink'}`}>Publicar agora</button>
        <button type="button" onClick={() => setMode('schedule')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === 'schedule' ? 'bg-accent text-white' : 'bg-app text-ink'}`}>Agendar</button>
      </div>

      {mode === 'schedule' && (
        <div>
          <label className="mb-1 block text-xs font-bold text-ink">Data e hora</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
            className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
        </div>
      )}

      {msg && <p className={`text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}

      <Button onClick={onSubmit} disabled={busy}>
        {busy ? 'Processando…' : mode === 'now' ? 'Publicar agora no Instagram' : 'Agendar publicação'}
      </Button>
    </div>
  );
}
