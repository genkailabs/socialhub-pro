'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthMatrix, groupPostsByDay, dayKey, statusMeta } from '@/lib/calendar';
import { PostDetail } from './PostDetail';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarGrid({ posts }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel, setSel] = useState(null);

  const grid = monthMatrix(year, month);
  const byDay = groupPostsByDay(posts);

  function shift(delta) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => shift(-1)} className="rounded-lg border border-line p-1.5 hover:bg-app"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-extrabold">{MONTHS[month]} {year}</span>
        <button onClick={() => shift(1)} className="rounded-lg border border-line p-1.5 hover:bg-app"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {DOW.map((d) => <div key={d} className="bg-surface px-2 py-1.5 text-center text-[10px] font-bold text-muted">{d}</div>)}
        {grid.flat().map((cell, i) => {
          const dayPosts = cell.inMonth ? (byDay[dayKey(cell.date)] || []) : [];
          return (
            <div key={i} className={`min-h-[74px] bg-surface p-1.5 ${cell.inMonth ? '' : 'opacity-40'}`}>
              <div className="text-[10px] font-bold text-muted">{cell.date.getDate()}</div>
              <div className="mt-1 space-y-1">
                {dayPosts.map((p) => {
                  const m = statusMeta(p.status);
                  return (
                    <button key={p.id} onClick={() => setSel(p)}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-bold text-white"
                      style={{ backgroundColor: m.color }} title={p.content || ''}>
                      {p.content?.slice(0, 18) || 'Post'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {sel && <PostDetail post={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
