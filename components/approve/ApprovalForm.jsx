'use client';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ApprovalForm({ approvalToken }) {
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send(action) {
    setBusy(true);
    setErr('');
    try {
      const response = await fetch('/api/approval/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: approvalToken, author, action, comment })
      });
      const res = await response.json();
      if (!response.ok || res?.error) { setErr(res?.error || 'Nao foi possivel enviar a resposta.'); return; }
      setDone(action);
    } catch {
      setErr('Nao foi possivel enviar a resposta. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const message = done === 'approved'
      ? 'Aprovado! O post foi agendado automaticamente.'
      : done === 'changes_requested'
        ? 'Pedido de ajustes enviado.'
        : 'Comentario enviado.';
    return (
      <div className="animate-pop flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-ink">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        {message}
      </div>
    );
  }

  const field = 'w-full rounded-xl glass px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

  return (
    <div className="space-y-3">
      <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Seu nome" className={field} />
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Comentario (opcional)" className={field} />
      {err && <p className="text-xs font-semibold text-danger">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => send('approved')} disabled={busy}>Aprovar</Button>
        <Button variant="outline" onClick={() => send('changes_requested')} disabled={busy}>Pedir ajustes</Button>
        <Button variant="ghost" onClick={() => send('comment_only')} disabled={busy}>So comentar</Button>
      </div>
    </div>
  );
}
