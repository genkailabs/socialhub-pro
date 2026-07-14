import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { refreshAccessToken, getChannel, getChannelStats, listChannelVideos, getVideoStats } from '@/lib/youtube/google';

export const maxDuration = 60;

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Integração YouTube não configurada.' }, { status: 500 });
  }

  const admin = createAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tokens, error } = await admin
    .from('social_tokens')
    .select('brand_id, platform_data')
    .eq('platform', 'youtube')
    .eq('is_active', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const tok of tokens || []) {
    const started = Date.now();
    const refreshToken = tok.platform_data?.refresh_token;
    if (!refreshToken) { results.push({ brand_id: tok.brand_id, status: 'error', reason: 'sem refresh_token' }); continue; }

    try {
      const fresh = await refreshAccessToken({ refreshToken, clientId, clientSecret });
      const accessToken = fresh.access_token;

      // 1) Canal → social_analytics_history
      const channel = await getChannel(accessToken);
      const chStats = await getChannelStats(accessToken, today);
      const followers = await channelFollowers(accessToken);
      await admin.from('social_analytics_history').upsert({
        brand_id: tok.brand_id,
        platform: 'youtube',
        snapshot_date: today,
        followers,
        total_reach: chStats.views
      }, { onConflict: 'brand_id,platform,snapshot_date' });

      // 2) Vídeos → youtube_video_stats
      const videos = await listChannelVideos(accessToken, 25);
      const start = firstDate(videos);
      for (const v of videos) {
        const vs = await getVideoStats(accessToken, v.videoId, start, today);
        await admin.from('youtube_video_stats').upsert({
          brand_id: tok.brand_id,
          video_id: v.videoId,
          title: v.title,
          published_at: v.publishedAt,
          snapshot_date: today,
          views: vs.views,
          likes: vs.likes,
          comments: vs.comments,
          avg_view_pct: vs.avgViewPct,
          watch_time_min: vs.watchTimeMin
        }, { onConflict: 'brand_id,video_id,snapshot_date' });
      }

      await admin.from('social_sync_logs').insert({
        brand_id: tok.brand_id, platform: 'youtube', status: 'success', duration_ms: Date.now() - started
      });
      results.push({ brand_id: tok.brand_id, status: 'success', channel: channel.title, videos: videos.length });
    } catch (e) {
      await admin.from('social_sync_logs').insert({
        brand_id: tok.brand_id, platform: 'youtube', status: 'error',
        error_message: e.message, duration_ms: Date.now() - started
      });
      results.push({ brand_id: tok.brand_id, status: 'error', reason: e.message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

// Total de inscritos via Data API (statistics).
async function channelFollowers(accessToken) {
  const url = 'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true';
  const data = await (await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
  if (data.error) return 0;
  return Number(data.items?.[0]?.statistics?.subscriberCount) || 0;
}

// Data de publicação mais antiga entre os vídeos (limite inferior da janela do Analytics).
function firstDate(videos) {
  const dates = videos.map((v) => v.publishedAt).filter(Boolean).sort();
  return (dates[0] || new Date().toISOString()).slice(0, 10);
}
