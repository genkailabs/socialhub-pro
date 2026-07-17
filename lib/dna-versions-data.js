import { createClient } from '@/lib/supabase/server';

// Histórico de versões do Brand DNA da marca, da mais nova para a mais antiga.
export async function listDnaVersions(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('brand_dna_versions')
    .select('id, version, content, report, sources, status, approved_at, created_at')
    .eq('brand_id', brandId)
    .order('version', { ascending: false });
  return data || [];
}
