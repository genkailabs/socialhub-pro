import { createClient } from '@/lib/supabase/server';

export async function getContentPlan(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('content_plans').select('*').eq('brand_id', brandId).maybeSingle();
  return data || null;
}
