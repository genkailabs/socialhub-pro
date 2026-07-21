'use client';
import { useState } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';

function CopyLink({ token }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/approve/${token}` : '';
  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] font-bold text-ink transition-colors hover:border-accent/40 hover:text-accent">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : 'Copiar link'}
    </button>
  );
}

const ACTION = {
  approved: { txt: 'aprovou', cls: 'text-success' },
  changes_requested: { txt: 'pediu ajustes', cls: 'text-warning' },
  comment_only: { txt: 'comentou', cls: 'text-muted' }
};

export function ApprovalsList({ posts }) {
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="rounded-2xl glass p-4 shadow-soft transition-shadow hover:shadow-lift">
          <div className="flex gap-4">
            {p.media_url && (
              <img src={p.media_url} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-[10px] font-extrabold text-warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Em aprovação
                </span>
                <CopyLink token={p.approval_token} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink">{p.content || '(sem legenda)'}</p>

              {p.comments?.length > 0 ? (
                <div className="mt-2.5 space-y-1.5 border-t border-line pt-2.5">
                  {p.comments.map((c, i) => {
                    const a = ACTION[c.action_taken] || ACTION.comment_only;
                    return (
                      <p key={i} className="text-[11px]">
                        <span className="font-bold text-ink">{c.author_name}</span>{' '}
                        <span className={`font-semibold ${a.cls}`}>{a.txt}</span>
                        {c.comment && c.comment !== '(sem comentário)' && <span className="text-muted"> — {c.comment}</span>}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                  <MessageSquare className="h-3.5 w-3.5" /> Aguardando retorno do cliente
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
