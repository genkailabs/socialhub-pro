// Transformações puras das respostas da YouTube Analytics API (v2/reports).
// Formato: { columnHeaders: [{ name }], rows: [[valores...]] }.

export function parseReportRow(json) {
  const headers = json?.columnHeaders || [];
  const row = json?.rows?.[0];
  if (!row) return {};
  const out = {};
  headers.forEach((h, i) => { out[h.name] = row[i]; });
  return out;
}

export function parseChannelReport(json) {
  const r = parseReportRow(json);
  return {
    views: Number(r.views) || 0,
    watchTimeMin: Number(r.estimatedMinutesWatched) || 0,
    subscribersGained: Number(r.subscribersGained) || 0
  };
}

// Relatório com dimensions=video: uma linha por vídeo. Devolve stats por videoId.
export function parseVideoRows(json) {
  const headers = json?.columnHeaders || [];
  const idx = (name) => headers.findIndex((h) => h.name === name);
  const vi = idx('video');
  if (vi < 0) return [];
  return (json?.rows || []).map((row) => ({
    videoId: row[vi],
    views: Number(row[idx('views')]) || 0,
    likes: Number(row[idx('likes')]) || 0,
    comments: Number(row[idx('comments')]) || 0,
    avgViewPct: Number(row[idx('averageViewPercentage')]) || 0,
    watchTimeMin: Number(row[idx('estimatedMinutesWatched')]) || 0
  }));
}
