export function summarizeMedia(media = []) {
  return media.reduce(
    (acc, m) => ({
      totalLikes: acc.totalLikes + (m.like_count || 0),
      totalComments: acc.totalComments + (m.comments_count || 0),
      count: acc.count + 1
    }),
    { totalLikes: 0, totalComments: 0, count: 0 }
  );
}

export function computeEngagement({ followers, totalLikes, totalComments, count }) {
  if (!followers || !count) return '0.0%';
  const avgInteractions = (totalLikes + totalComments) / count;
  return ((avgInteractions / followers) * 100).toFixed(1) + '%';
}
