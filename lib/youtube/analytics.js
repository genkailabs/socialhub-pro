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

export function parseVideoReport(json) {
  const r = parseReportRow(json);
  return {
    views: Number(r.views) || 0,
    likes: Number(r.likes) || 0,
    comments: Number(r.comments) || 0,
    avgViewPct: Number(r.averageViewPercentage) || 0,
    watchTimeMin: Number(r.estimatedMinutesWatched) || 0
  };
}
