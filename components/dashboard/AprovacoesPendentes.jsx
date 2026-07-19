import Link from 'next/link';

function contentPreview(post) {
  const text = (post.content || '').trim();
  if (text) return text.length > 40 ? `${text.slice(0, 40)}…` : text;
  return 'Conteúdo pronto para revisão';
}

function whenLabel(post) {
  if (!post.scheduled_at) return 'Sem horário definido';
  const d = new Date(post.scheduled_at);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${isToday ? 'Hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${time}`;
}

export function AprovacoesPendentes({ posts }) {
  return (
    <div className="rounded-[22px] border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight text-ink">Aprovações pendentes</h2>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-semibold text-accent">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
      </div>

      <div className="mt-4 space-y-2">
        {posts.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">Nada aguardando aprovação.</p>
        )}
        {posts.slice(0, 2).map((post) => (
          <div key={post.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-line px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="h-[30px] w-[30px] shrink-0 rounded-[10px] bg-surface-2" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-ink">{contentPreview(post)}</p>
                <p className="mt-0.5 text-[10px] text-muted">{post.networks?.[0] === 'facebook' ? 'Facebook' : 'Instagram'} • {whenLabel(post)}</p>
              </div>
            </div>
            <Link href="/approvals" className="shrink-0 rounded-full border border-line bg-surface-2 px-3 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/10">
              Aprovar
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
