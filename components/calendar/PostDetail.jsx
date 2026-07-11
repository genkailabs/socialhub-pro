'use client';
import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { requestApproval } from '@/lib/approval-actions';
import { statusMeta } from '@/lib/calendar';
import { Button } from '@/components/ui/Button';

export function PostDetail({ post, onClose }) {
  const [token, setToken] = useState(post.approval_token);
  const [status, setStatus] = useState(post.status);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = statusMeta(status);
  const link = typeof window !== 'undefined' && token ? `${window.location.origin}/approve/${token}` : '';

  async function onRequest() {
    setBusy(true);
    const res = await requestApproval(post.id);
    setBusy(false);
    if (res?.ok) { setToken(res.token); setStatus('waiting_approval'); }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: meta.color }}>{meta.label}</span>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-app"><X className="h-4 w-4" /></button>
        </div>
        {post.media_url && <img src={post.media_url} alt="" className="mb-3 max-h-56 w-full rounded-xl border border-line object-cover" />}
        <p className="text-sm text-ink whitespace-pre-wrap">{post.content || '(sem legenda)'}</p>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-bold text-ink">Aprovação do cliente</p>
          {!token || status !== 'waiting_approval' ? (
            <Button size="sm" onClick={onRequest} disabled={busy}>{busy ? 'Gerando…' : 'Gerar link de aprovação'}</Button>
          ) : (
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="flex-1 rounded-lg border border-line bg-app px-2.5 py-1.5 text-[11px] text-muted" />
              <button onClick={copy} className="rounded-lg bg-accent px-2.5 py-1.5 text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
            </div>
          )}
        </div>

        {Array.isArray(post.comments) && post.comments.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-line pt-3">
            <p className="text-xs font-bold text-ink">Retornos do cliente</p>
            {post.comments.map((c, i) => (
              <div key={i} className="rounded-lg bg-app p-2 text-[11px]">
                <span className="font-bold text-ink">{c.author_name}</span>
                <span className="ml-1 text-muted">· {c.action_taken === 'approved' ? 'aprovou' : c.action_taken === 'changes_requested' ? 'pediu ajustes' : 'comentou'}</span>
                <p className="mt-0.5 text-ink">{c.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
