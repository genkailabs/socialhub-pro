import Link from 'next/link';
import { statusMeta } from '@/lib/calendar';

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function timeOf(value) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Agenda de publicação: a faixa de dias mostra a semana à frente e a lista, o
 * que sai em cada horário.
 *
 * A faixa marca com um ponto os dias que têm post — é o que responde "estou com
 * buraco na semana?" sem abrir o calendário. Dia sem nada fica apagado, e não
 * escondido: buraco é informação.
 */
export function AgendaHoje({ posts = [], now = new Date() }) {
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return {
      date,
      label: WEEKDAY[date.getDay()],
      day: date.getDate(),
      count: posts.filter((post) => post.scheduled_at && sameDay(new Date(post.scheduled_at), date)).length,
      today: index === 0
    };
  });

  const upcoming = posts
    .filter((post) => post.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">Agenda</p>
          <h2 className="mt-1 text-[19px] font-bold leading-tight tracking-tight text-ink">Próximas publicações</h2>
        </div>
        <Link href="/calendar" className="text-[12.5px] font-semibold text-accent-ink hover:underline">Calendário</Link>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {days.map((day) => (
          <div
            key={day.date.toISOString()}
            className={`rounded-xl border px-1 py-2 text-center ${
              day.today ? 'border-accent bg-accent/12' : 'border-line bg-surface-2'
            }`}
          >
            <p className={`text-[9.5px] font-bold uppercase tracking-[0.08em] ${day.today ? 'text-accent-ink' : 'text-faint'}`}>
              {day.label}
            </p>
            <p className={`mt-0.5 font-mono text-[15px] font-bold tabular-nums ${day.today ? 'text-accent-ink' : 'text-ink'}`}>
              {day.day}
            </p>
            <span
              aria-hidden="true"
              className={`mx-auto mt-1 block h-1 w-1 rounded-full ${day.count ? 'bg-success' : 'bg-transparent'}`}
            />
            <span className="sr-only">{day.count ? `${day.count} publicação(ões)` : 'sem publicação'}</span>
          </div>
        ))}
      </div>

      <ul className="mt-4 flex-1 divide-y divide-line">
        {upcoming.length === 0 && (
          <li className="py-7 text-center text-[12.5px] text-muted">Nada agendado nos próximos dias.</li>
        )}
        {upcoming.map((post) => (
          <li key={post.id} className="flex items-center gap-3 py-2.5">
            <span className="font-mono text-[12px] font-semibold tabular-nums text-muted">{timeOf(post.scheduled_at)}</span>
            <span aria-hidden="true" className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: statusMeta(post.status).color }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">{post.title || 'Publicação agendada'}</span>
              <span className="mt-0.5 block text-[10.5px] text-muted">{statusMeta(post.status).label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
