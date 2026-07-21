// Cálculo puro de melhores horários de postagem. Sem I/O.
// videoStats: [{ published_at: ISO string, views: number }]
// tzOffsetHours: deslocamento do fuso (BR = -3). weekday: 0=domingo.

export const MIN_HISTORY = 5;

// Janelas genéricas de bom engajamento no BR (fallback sem histórico).
const HEURISTIC = [
  { weekday: 2, hour: 19 }, // terça
  { weekday: 4, hour: 20 }, // quinta
  { weekday: 0, hour: 11 }  // domingo
];

function localParts(iso, tzOffsetHours) {
  const shifted = new Date(new Date(iso).getTime() + tzOffsetHours * 3600 * 1000);
  return { weekday: shifted.getUTCDay(), hour: shifted.getUTCHours() };
}

export function suggestBestTimes({ videoStats = [], tzOffsetHours = -3 } = {}) {
  const usable = videoStats.filter((v) => v.published_at);
  if (usable.length < MIN_HISTORY) {
    return HEURISTIC.map((h) => ({ ...h, score: 0, basis: 'heuristic' }));
  }

  // Agrupa por (weekday,hour), soma views, rankeia desc.
  const buckets = new Map();
  for (const v of usable) {
    const { weekday, hour } = localParts(v.published_at, tzOffsetHours);
    const key = `${weekday}-${hour}`;
    const cur = buckets.get(key) || { weekday, hour, score: 0 };
    cur.score += Number(v.views) || 0;
    buckets.set(key, cur);
  }
  return [...buckets.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((b) => ({ ...b, basis: 'channel' }));
}
