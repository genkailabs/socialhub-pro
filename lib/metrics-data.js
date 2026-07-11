import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfile, fetchInstagramMedia } from '@/lib/meta/graph';
import { summarizeMedia, computeEngagement } from '@/lib/meta/metrics';

export async function getFollowerHistory(brandId, days = 14) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_analytics_history')
    .select('snapshot_date, followers')
    .eq('brand_id', brandId)
    .eq('platform', 'instagram')
    .order('snapshot_date', { ascending: true })
    .limit(days);
  return data || [];
}

// Lê o token do IG da marca (RLS garante posse) e retorna métricas reais, ou null.
export async function getBrandInstagramMetrics(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id, platform_username, platform_data')
    .eq('brand_id', brandId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();

  if (!token) return null;

  try {
    const profile = await fetchInstagramProfile(token.platform_user_id, token.access_token);
    const media = await fetchInstagramMedia(token.platform_user_id, token.access_token);
    const summary = summarizeMedia(media);
    const followers = profile.followers_count || 0;

    const metrics = {
      username: profile.username || token.platform_username,
      profilePicture: profile.profile_picture_url || token.platform_data?.profile_picture_url || null,
      followers,
      mediaCount: profile.media_count || 0,
      engagement: computeEngagement({ followers, ...summary }),
      totalLikes: summary.totalLikes,
      totalComments: summary.totalComments,
      sample: summary.count
    };

    // Snapshot diário best-effort (histórico real; não bloqueia render)
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('social_analytics_history').upsert({
      brand_id: brandId,
      platform: 'instagram',
      snapshot_date: today,
      followers,
      engagement_rate: metrics.engagement,
      total_reach: 0
    }, { onConflict: 'brand_id,platform,snapshot_date' }).then(() => {}, () => {});

    return { ok: true, metrics };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
