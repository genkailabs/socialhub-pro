import Link from 'next/link';
import { reportHref } from '@/lib/reports/channel-adapters';

const channels = [
  ['overview', 'Visao geral'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube']
];

export function ReportNavigation({ activeChannel }) {
  return (
    <nav aria-label="Canais do relatorio" className="flex flex-wrap gap-2">
      {channels.map(([channel, label]) => {
        const active = channel === activeChannel;
        return <Link key={channel} href={reportHref(channel)} className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${active ? 'bg-accent text-white' : 'border border-line bg-surface text-muted hover:border-accent/60 hover:text-ink'}`}>{label}</Link>;
      })}
      <span className="rounded-lg border border-dashed border-line px-3.5 py-2 text-xs font-semibold text-muted" title="Novas redes usam um adaptador proprio de metricas">Novas redes em breve</span>
    </nav>
  );
}
