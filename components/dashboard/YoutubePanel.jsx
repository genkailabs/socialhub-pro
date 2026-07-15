import { Youtube, Clock } from 'lucide-react';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function YoutubePanel({ account, history, videos, bestTimes }) {
  const top = bestTimes?.[0];
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FF0000]/15 text-[#FF0000]">
          <Youtube className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold text-ink tracking-tight font-theme">
          YouTube · @{account?.platform_username || 'canal'}
        </p>
      </div>

      {top && (
        <div className="flex items-center gap-2.5 rounded-xl border border-line/80 dark:border-line/40 bg-surface-2/70 p-4 text-xs">
          <Clock className="h-4 w-4 text-accent shrink-0" />
          <span className="text-ink">
            Melhor horário para postar: <strong className="font-mono">{WD[top.weekday]} {String(top.hour).padStart(2, '0')}h</strong>
          </span>
          <span className="ml-auto text-[11px] font-medium text-muted">
            {top.basis === 'channel' ? 'baseado no seu canal' : 'sugestão geral'}
          </span>
        </div>
      )}

      <FollowerTrend data={history} />

      {videos?.length > 0 && (
        <div className="rounded-2xl border border-line/80 dark:border-line/40 bg-surface p-5 shadow-soft">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Vídeos · desempenho recente
          </p>
          <ul className="divide-y divide-line/60 dark:divide-line/30">
            {videos.map((v) => (
              <li key={v.video_id} className="group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors duration-200">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink group-hover:text-accent transition-colors">
                  {v.title || v.video_id}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {fmt(v.views)} views
                </span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {Math.round(v.avg_view_pct)}% retenção
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

