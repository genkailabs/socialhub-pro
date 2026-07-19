import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function googleJson(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || `YouTube respondeu ${response.status}`);
  return data;
}

async function refreshToken(refreshToken: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Credenciais do YouTube nao configuradas.');
  const body = new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description || data.error || 'Nao foi possivel renovar token do YouTube.');
  return data.access_token as string;
}

Deno.serve(async (request) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (request.method !== 'POST' || !serviceKey || request.headers.get('authorization') !== `Bearer ${serviceKey}`) return json({ error: 'Nao autorizado' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows, error } = await supabase.from('social_tokens').select('brand_id, platform_data').eq('platform', 'youtube').eq('is_active', true);
  if (error) return json({ error: error.message }, 500);
  const results = [];
  for (const row of rows || []) {
    const started = Date.now();
    try {
      const token = await refreshToken(row.platform_data?.refresh_token || '');
      const channelData = await googleJson('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true', token);
      const channel = channelData.items?.[0];
      if (!channel) throw new Error('Nenhum canal do YouTube encontrado.');
      const followers = Number(channel.statistics?.subscriberCount) || 0;
      const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
      const videosData = uploads ? await googleJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=${uploads}`, token) : { items: [] };
      await supabase.from('social_analytics_history').upsert({ brand_id: row.brand_id, platform: 'youtube', snapshot_date: today, followers, total_reach: Number(channel.statistics?.viewCount) || 0 }, { onConflict: 'brand_id,platform,snapshot_date' });
      for (const video of videosData.items || []) {
        const id = video.contentDetails?.videoId;
        if (!id) continue;
        await supabase.from('youtube_video_stats').upsert({ brand_id: row.brand_id, video_id: id, title: video.snippet?.title || '', published_at: video.contentDetails?.videoPublishedAt || video.snippet?.publishedAt || null, snapshot_date: today }, { onConflict: 'brand_id,video_id,snapshot_date' });
      }
      await supabase.from('social_sync_logs').insert({ brand_id: row.brand_id, platform: 'youtube', status: 'success', duration_ms: Date.now() - started });
      results.push({ brandId: row.brand_id, status: 'success' });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Erro desconhecido ao sincronizar YouTube.';
      await supabase.from('social_sync_logs').insert({ brand_id: row.brand_id, platform: 'youtube', status: 'error', error_message: message, duration_ms: Date.now() - started });
      results.push({ brandId: row.brand_id, status: 'error', error: message });
    }
  }
  return json({ ok: true, processed: results.length, results });
});
