'use client';
import { useState } from 'react';
import { submitApproval } from '@/lib/approval-actions';
import { Button } from '@/components/ui/Button';

export function ApprovalForm({ postId }) {
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send(action) {
    setBusy(true); setErr('');
    const res = await submitApproval({ postId, author, action, comment });
    setBusy(false);
    if (res?.error) { setErr(res.error); return; }
    setDone(action);
  }

  if (done) {
    return <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
      {done === 'approved' ? 'Aprovado! Obrigado pelo retorno.' : done === 'changes_requested' ? 'Pedido de ajustes enviado.' : 'Comentário enviado.'}
    </p>;
  }

  return (
    <div className="space-y-3">
      <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Seu nome"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comentário (opcional)"
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
      {err && <p className="text-xs font-semibold text-red-600">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => send('approved')} disabled={busy}>Aprovar</Button>
        <Button variant="outline" onClick={() => send('changes_requested')} disabled={busy}>Pedir ajustes</Button>
        <Button variant="ghost" onClick={() => send('comment_only')} disabled={busy}>Só comentar</Button>
      </div>
    </div>
  );
}
