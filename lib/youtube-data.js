import { createClient } from '@/lib/supabase/server';
import { suggestBestTimes } from '@/lib/youtube/best-times';

// Existe token YouTube ativo para a marca?
export async function hasYoutube(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_tokens')
    .select('platform_username, platform_data')
    .eq('brand_id', brandId).eq('platform', 'youtube').eq('is_active', true)
    .maybeSingle();
  return data || null;
}

// Histórico de inscritos no formato que o FollowerTrend espera ({ snapshot_date, followers }).
export async function getYoutubeFollowerHistory(brandId, days = 14) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_analytics_history')
    .select('snapshot_date, followers')
    .eq('brand_id', brandId).eq('platform', 'youtube')
    .order('snapshot_date', { ascending: true })
    .limit(days);
  return data || [];
}

// Último snapshot de cada vídeo (mais recente primeiro).
export async function getYoutubeVideos(brandId, limit = 12) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('youtube_video_stats')
    .select('video_id, title, published_at, views, likes, comments, avg_view_pct, snapshot_date')
    .eq('brand_id', brandId)
    .order('snapshot_date', { ascending: false })
    .order('views', { ascending: false })
    .limit(200);
  // Deduplica por video_id mantendo o snapshot mais recente.
  const seen = new Map();
  for (const row of data || []) if (!seen.has(row.video_id)) seen.set(row.video_id, row);
  return [...seen.values()].slice(0, limit);
}

// Sugestão de melhor horário a partir do histórico de vídeos.
export async function getYoutubeBestTimes(brandId) {
  const videos = await getYoutubeVideos(brandId, 200);
  return suggestBestTimes({
    videoStats: videos.map((v) => ({ published_at: v.published_at, views: v.views })),
    tzOffsetHours: -3
  });
}
