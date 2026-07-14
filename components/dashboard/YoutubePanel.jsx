import { Youtube, Clock } from 'lucide-react';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function YoutubePanel({ account, history, videos, bestTimes }) {
  const top = bestTimes?.[0];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Youtube className="h-4 w-4 text-[#FF0000]" />
        <p className="text-sm font-extrabold text-ink">YouTube · @{account?.platform_username || 'canal'}</p>
      </div>

      {top && (
        <div className="glass flex items-center gap-2 rounded-2xl p-4 text-sm">
          <Clock className="h-4 w-4 text-accent" />
          <span className="text-ink">
            Melhor horário para postar: <strong>{WD[top.weekday]} {String(top.hour).padStart(2, '0')}h</strong>
          </span>
          <span className="ml-auto text-[11px] text-muted">
            {top.basis === 'channel' ? 'baseado no seu canal' : 'sugestão geral'}
          </span>
        </div>
      )}

      <FollowerTrend data={history} />

      {videos?.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Vídeos · desempenho</p>
          <ul className="divide-y divide-line">
            {videos.map((v) => (
              <li key={v.video_id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{v.title || v.video_id}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">{fmt(v.views)} views</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">{Math.round(v.avg_view_pct)}% retenção</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
