import { Youtube, Clock } from 'lucide-react';
import { FollowerTrend } from '@/components/dashboard/FollowerTrend';

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n ?? 0));

export function YoutubePanel({ account, history, videos, bestTimes }) {
  const top = bestTimes?.[0];
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF0000]/15 text-[#FF0000] border border-[#FF0000]/30 shadow-sm">
          <Youtube className="h-4 w-4" />
        </span>
        <div>
          <p className="text-base font-bold text-ink tracking-tight">
            YouTube Analytics · @{account?.platform_username || 'canal'}
          </p>
          <p className="text-xs text-muted">Retenção de público & horários de pico</p>
        </div>
      </div>

      {top && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-4 text-xs shadow-sm">
          <Clock className="h-4 w-4 text-accent shrink-0" />
          <span className="text-ink font-medium">
            Melhor horário para postar: <strong className="font-mono text-white bg-accent/20 border border-accent/40 px-2 py-0.5 rounded ml-1">{WD[top.weekday]} {String(top.hour).padStart(2, '0')}h</strong>
          </span>
          <span className="ml-auto text-[11px] font-mono font-semibold text-accent">
            {top.basis === 'channel' ? 'baseado no seu canal' : 'sugestão geral'}
          </span>
        </div>
      )}

      <FollowerTrend data={history} />

      {videos?.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <p className="text-sm font-bold text-ink tracking-tight">
              Vídeos · Desempenho & Retenção
            </p>
            <span className="text-xs font-mono text-muted">Últimos uploads</span>
          </div>
          <ul className="divide-y divide-line">
            {videos.map((v) => (
              <li key={v.video_id} className="group flex items-center gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors duration-200">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink group-hover:text-accent transition-colors">
                  {v.title || v.video_id}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums bg-surface-2 border border-line px-2.5 py-1 rounded-md">
                  {fmt(v.views)} views
                </span>
                <span className="shrink-0 font-mono text-xs text-accent tabular-nums font-bold bg-accent/15 border border-accent/30 px-2.5 py-1 rounded-md">
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
