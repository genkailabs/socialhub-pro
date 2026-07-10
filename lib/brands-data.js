import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { brandFromRow, ACTIVE_COOKIE } from '@/lib/brands';

export async function listBrands() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error || !data) return [];
  return data.map(brandFromRow);
}

export async function getActiveBrandId() {
  const store = await cookies();
  return store.get(ACTIVE_COOKIE)?.value || null;
}
