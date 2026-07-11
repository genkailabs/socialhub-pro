export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0=dom
  const gridStart = new Date(year, month, 1 - startDow);
  const weeks = [];
  const cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      week.push({ date, inMonth: date.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  // remove última semana se totalmente fora do mês
  const last = weeks[5];
  if (last.every((d) => !d.inMonth)) weeks.pop();
  return weeks;
}

export function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export function groupPostsByDay(posts = []) {
  const g = {};
  for (const p of posts) {
    if (!p.scheduled_at) continue;
    const k = dayKey(p.scheduled_at);
    (g[k] ||= []).push(p);
  }
  return g;
}

const STATUS = {
  published: { label: 'Publicado', color: '#10B981' },
  scheduled: { label: 'Agendado', color: '#6366F1' },
  waiting_approval: { label: 'Em aprovação', color: '#F59E0B' },
  error: { label: 'Erro', color: '#EF4444' },
  draft: { label: 'Rascunho', color: '#8B93A3' }
};

export function statusMeta(status) {
  return STATUS[status] || STATUS.draft;
}
