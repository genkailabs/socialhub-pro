'use client';
import { useState } from 'react';
import { X, Copy, Check, Link2 } from 'lucide-react';
import { requestApproval } from '@/lib/approval-actions';
import { statusMeta } from '@/lib/calendar';
import { Button } from '@/components/ui/Button';

const ACTION_TXT = { approved: 'aprovou', changes_requested: 'pediu ajustes', comment_only: 'comentou' };

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
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-md overflow-hidden rounded-2xl glass shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white" style={{ backgroundColor: meta.color }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" /> {meta.label}
          </span>
          <button onClick={onClose} className="rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5">
          {post.media_url && <img src={post.media_url} alt="" className="mb-3 max-h-56 w-full rounded-xl border border-line object-cover" />}
          <p className="whitespace-pre-wrap text-sm text-ink">{post.content || '(sem legenda)'}</p>

          <div className="mt-5 rounded-xl border border-line bg-surface-2 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink"><Link2 className="h-3.5 w-3.5 text-accent" /> Aprovação do cliente</p>
            {!token || status !== 'waiting_approval' ? (
              <Button size="sm" onClick={onRequest} disabled={busy} className="w-full">{busy ? 'Gerando…' : 'Gerar link de aprovação'}</Button>
            ) : (
              <div className="flex items-center gap-2">
                <input readOnly value={link} className="min-w-0 flex-1 rounded-lg glass px-2.5 py-1.5 text-[11px] text-muted" />
                <button onClick={copy} className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-white transition-transform hover:scale-105">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
              </div>
            )}
          </div>

          {Array.isArray(post.comments) && post.comments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-ink">Retornos do cliente</p>
              {post.comments.map((c, i) => (
                <div key={i} className="rounded-lg border border-line bg-surface-2 p-2.5 text-[11px]">
                  <span className="font-bold text-ink">{c.author_name}</span>
                  <span className="ml-1 text-muted">· {ACTION_TXT[c.action_taken] || 'comentou'}</span>
                  {c.comment && <p className="mt-0.5 text-ink">{c.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
