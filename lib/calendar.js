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

// Cores do Aurora Grid pelo papel do estado: roxo enquanto o conteúdo está em
// jogo (agendado, pronto pra postar), lima quando chegou ao fim da linha
// (publicado), laranja quando espera alguém e vermelho quando quebrou.
//
// Os valores são hex fixo, e não token, porque entram em `style` de bolinha e
// de barra do calendário. Por isso são tons médios: precisam se ver tanto sobre
// o grafite do tema escuro quanto sobre o branco do claro.
const STATUS = {
  published: { label: 'Publicado', color: '#5BA81B' },
  scheduled: { label: 'Agendado', color: '#7566FF' },
  publishing: { label: 'Publicando', color: '#E58A3C' },
  failed: { label: 'Falhou', color: '#E5484D' },
  cancelled: { label: 'Cancelado', color: '#8792A8' },
  waiting_approval: { label: 'Em aprovação', color: '#E58A3C' },
  error: { label: 'Erro', color: '#E5484D' },
  draft: { label: 'Rascunho', color: '#8792A8' },
  // Formatos que o Social Hub não posta sozinho (§5.1). O rótulo diz de quem é
  // a vez: o sistema não pode sugerir que publicou o que a pessoa postou à mão.
  ready_to_post: { label: 'Pronto p/ você postar', color: '#7566FF' },
  posted_manually: { label: 'Você postou', color: '#5BA81B' }
};

export function statusMeta(status) {
  return STATUS[status] || STATUS.draft;
}
