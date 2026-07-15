'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
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
    return (
      <div className="animate-pop flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-ink">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        {done === 'approved' ? 'Aprovado! Obrigado pelo retorno.' : done === 'changes_requested' ? 'Pedido de ajustes enviado.' : 'Comentário enviado.'}
      </div>
    );
  }

  const field = 'w-full rounded-xl glass px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

  return (
    <div className="space-y-3">
      <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Seu nome" className={field} />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Comentário (opcional)" className={field} />
      {err && <p className="text-xs font-semibold text-danger">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => send('approved')} disabled={busy}>Aprovar</Button>
        <Button variant="outline" onClick={() => send('changes_requested')} disabled={busy}>Pedir ajustes</Button>
        <Button variant="ghost" onClick={() => send('comment_only')} disabled={busy}>Só comentar</Button>
      </div>
    </div>
  );
}
