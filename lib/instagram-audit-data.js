import { createClient } from '@/lib/supabase/server';

// Último diagnóstico salvo da marca. O diagnóstico é caro (chama Meta + IA),
// então a tela lê o que já existe em vez de refazer a cada visita (§16 Performance).
export async function getLatestAudit(brandId) {
  if (!brandId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('instagram_audits')
    .select('id, calculated_metrics, ai_analysis, confidence, unavailable, skill_version, created_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}
