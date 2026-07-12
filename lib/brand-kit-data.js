import { createClient } from '@/lib/supabase/server';

export async function getBrandKit(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('brand_kits').select('*').eq('brand_id', brandId).maybeSingle();
  return data || null;
}
