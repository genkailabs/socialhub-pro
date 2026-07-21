import Link from 'next/link';

const CHANNEL_LABEL = { instagram: 'IG', facebook: 'FB', youtube: 'YT' };
const FORMAT_LABEL = { image: 'Imagem', carousel: 'Carrossel', reel: 'Reel', stories: 'Stories' };

function timeOf(post) {
  const d = new Date(post.scheduled_at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function AgendaHoje({ posts }) {
  return (
    <div className="flex h-full flex-col rounded-[22px] border border-line bg-surface p-5 shadow-soft">
      <h2 className="text-base font-bold tracking-tight text-ink">Agenda de hoje</h2>
      <p className="mt-0.5 text-[11px] text-muted">Próximas publicações programadas</p>

      <div className="mt-4 flex-1 space-y-2.5">
        {posts.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">Nenhum post agendado para hoje.</p>
        )}
        {posts.slice(0, 3).map((post) => (
          <div key={post.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
            <div className="grid h-8 w-16 shrink-0 place-items-center rounded-full bg-surface-2">
              <span className="font-mono text-[11px] font-bold text-accent">{timeOf(post)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{FORMAT_LABEL[post.format] || 'Post'} • {post.networks?.[0] === 'facebook' ? 'Facebook' : 'Instagram'}</p>
              <p className="mt-0.5 text-[10px] text-muted">Pronto para publicar</p>
            </div>
            <div className="grid h-6 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface-2">
              <span className="text-[10px] font-semibold text-ink">{CHANNEL_LABEL[post.networks?.[0]] || 'IG'}</span>
            </div>
          </div>
        ))}
      </div>

      <Link href="/calendar" className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10">
        Ver calendário completo <ArrowRightIcon />
      </Link>
    </div>
  );
}

function ArrowRightIcon() {
  return <span aria-hidden>→</span>;
}
