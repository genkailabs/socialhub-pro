'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthMatrix, groupPostsByDay, dayKey, statusMeta } from '@/lib/calendar';
import { PostDetail } from './PostDetail';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const LEGEND = ['published', 'scheduled', 'waiting_approval', 'draft', 'error'];

export function CalendarGrid({ posts }) {
  const today = new Date();
  const todayKey = dayKey(today);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel, setSel] = useState(null);

  const grid = monthMatrix(year, month);
  const byDay = groupPostsByDay(posts);

  function shift(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => shift(1)} className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <span className="text-base font-extrabold tracking-tight">{MONTHS[month]} <span className="text-muted">{year}</span></span>
        <button onClick={goToday} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-bold text-muted transition-colors hover:border-accent/40 hover:text-accent">Hoje</button>

        <div className="ml-auto hidden flex-wrap items-center gap-3 sm:flex">
          {LEGEND.map((s) => {
            const m = statusMeta(s);
            return (
              <span key={s} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} /> {m.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {DOW.map((d, i) => (
          <div key={d} className={`bg-surface px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide ${i === 0 || i === 6 ? 'text-faint' : 'text-muted'}`}>{d}</div>
        ))}
        {grid.flat().map((cell, i) => {
          const dayPosts = cell.inMonth ? (byDay[dayKey(cell.date)] || []) : [];
          const isToday = dayKey(cell.date) === todayKey;
          const weekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          return (
            <div key={i} className={`relative min-h-[86px] p-1.5 transition-colors ${!cell.inMonth ? 'bg-surface-2/50 opacity-50' : weekend ? 'bg-surface-2/60' : 'bg-surface'} hover:bg-accent-tint/40`}>
              <div className={`inline-grid h-5 min-w-5 place-items-center rounded-md px-1 text-[10px] font-bold ${isToday ? 'bg-accent text-white' : 'text-muted'}`}>
                {cell.date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayPosts.slice(0, 3).map((p) => {
                  const m = statusMeta(p.status);
                  return (
                    <button key={p.id} onClick={() => setSel(p)}
                      className="flex w-full items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[10px] font-bold text-white transition-transform hover:scale-[1.02]"
                      style={{ backgroundColor: m.color }} title={p.content || ''}>
                      <span className="truncate">{p.content?.slice(0, 16) || 'Post'}</span>
                    </button>
                  );
                })}
                {dayPosts.length > 3 && (
                  <button onClick={() => setSel(dayPosts[3])} className="w-full rounded-md px-1.5 text-left text-[10px] font-bold text-muted hover:text-ink">
                    +{dayPosts.length - 3} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {sel && <PostDetail post={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
