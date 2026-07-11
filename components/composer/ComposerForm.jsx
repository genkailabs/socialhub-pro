'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { publishNow } from '@/lib/posts-actions';
import { Button } from '@/components/ui/Button';

export function ComposerForm({ brandId }) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function onPick(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
    setMsg(null);
  }

  async function onPublish() {
    if (!file) { setMsg({ type: 'err', text: 'Escolha uma imagem.' }); return; }
    setBusy(true);
    setMsg(null);
    try {
      // 1. upload pro Storage (bucket público media) via sessão do usuário
      const supabase = createClient();
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${brandId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);

      // 2. publica no IG
      const res = await publishNow({ brandId, caption, imageUrl: pub.publicUrl });
      if (res?.error) throw new Error(res.error);

      setMsg({ type: 'ok', text: 'Publicado no Instagram! 🎉' });
      setCaption(''); setFile(null); setPreview(null);
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

      {preview && (
        <img src={preview} alt="prévia" className="max-h-64 rounded-xl border border-line object-contain" />
      )}

      {msg && (
        <p className={`text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>
      )}

      <Button onClick={onPublish} disabled={busy}>{busy ? 'Publicando…' : 'Publicar agora no Instagram'}</Button>
    </div>
  );
}
