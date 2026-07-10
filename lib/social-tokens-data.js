import { createClient } from '@/lib/supabase/server';

export async function listConnectedPlatforms(brandId) {
  if (!brandId) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from('social_tokens')
    .select('platform, platform_username, platform_data, is_active')
    .eq('brand_id', brandId)
    .eq('is_active', true);
  const map = {};
  (data || []).forEach((t) => { map[t.platform] = t; });
  return map;
}
