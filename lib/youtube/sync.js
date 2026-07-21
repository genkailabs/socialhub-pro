import {
  refreshAccessToken,
  getChannel,
  getChannelStats,
  listChannelVideos,
  getVideosStats
} from '@/lib/youtube/google';

export async function syncYoutubeBrandMetrics({
  admin,
  brandId,
  today = new Date().toISOString().slice(0, 10),
  accessToken,
  refreshToken,
  clientId = process.env.GOOGLE_CLIENT_ID,
  clientSecret = process.env.GOOGLE_CLIENT_SECRET
}) {
  if (!admin) throw new Error('Cliente Supabase admin ausente.');
  if (!brandId) throw new Error('brand_id ausente.');

  const started = Date.now();

  try {
    const token = await resolveAccessToken({
      accessToken,
      refreshToken,
      clientId,
      clientSecret
    });

    const channel = await getChannel(token);
    const channelStats = await getChannelStats(token, today);
    const followers = await getChannelFollowers(token);

    await admin.from('social_analytics_history').upsert({
      brand_id: brandId,
      platform: 'youtube',
      snapshot_date: today,
      followers,
      total_reach: channelStats.views
    }, { onConflict: 'brand_id,platform,snapshot_date' });

    const videos = await listChannelVideos(token, 25);
    const firstVideoDate = getFirstVideoDate(videos, today);
    const statsList = await getVideosStats(token, videos.map((video) => video.videoId), firstVideoDate, today);
    const statsById = new Map(statsList.map((stat) => [stat.videoId, stat]));

    for (const video of videos) {
      const stats = statsById.get(video.videoId) || defaultVideoStats();
      await admin.from('youtube_video_stats').upsert({
        brand_id: brandId,
        video_id: video.videoId,
        title: video.title,
        published_at: video.publishedAt,
        snapshot_date: today,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        avg_view_pct: stats.avgViewPct,
        watch_time_min: stats.watchTimeMin
      }, { onConflict: 'brand_id,video_id,snapshot_date' });
    }

    await admin.from('social_sync_logs').insert({
      brand_id: brandId,
      platform: 'youtube',
      status: 'success',
      duration_ms: Date.now() - started
    });

    return {
      channel,
      videos,
      followers,
      channelStats
    };
  } catch (error) {
    await safeInsertSyncLog(admin, {
      brand_id: brandId,
      platform: 'youtube',
      status: 'error',
      error_message: error?.message || 'Erro ao sincronizar métricas do YouTube.',
      duration_ms: Date.now() - started
    });
    throw error;
  }
}

async function resolveAccessToken({ accessToken, refreshToken, clientId, clientSecret }) {
  if (accessToken) return accessToken;
  if (!refreshToken) throw new Error('sem refresh_token');
  if (!clientId || !clientSecret) {
    throw new Error('Integração YouTube não configurada.');
  }
  const fresh = await refreshAccessToken({ refreshToken, clientId, clientSecret });
  return fresh.access_token;
}

async function getChannelFollowers(accessToken) {
  const url = 'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true';
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await response.json();
  if (data.error) return 0;
  return Number(data.items?.[0]?.statistics?.subscriberCount) || 0;
}

function getFirstVideoDate(videos, fallbackDate) {
  const dates = videos.map((video) => video.publishedAt).filter(Boolean).sort();
  return (dates[0] || fallbackDate).slice(0, 10);
}

function defaultVideoStats() {
  return {
    views: 0,
    likes: 0,
    comments: 0,
    avgViewPct: 0,
    watchTimeMin: 0
  };
}

async function safeInsertSyncLog(admin, payload) {
  try {
    await admin.from('social_sync_logs').insert(payload);
  } catch {
    // O log não deve bloquear a sincronização principal.
  }
}
