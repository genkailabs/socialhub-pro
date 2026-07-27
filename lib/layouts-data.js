import { createClient } from '@/lib/supabase/server';

// Quantos layouts recentes alimentam a antirrepetição (§13). Poucos demais e a
// marca recebe a mesma estrutura de novo; muitos demais e sobra só o fallback.
export const RECENT_LAYOUT_WINDOW = 5;

async function safeQuery(query) {
  try {
    const { data, error } = await query();
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Estruturas e estilos usados recentemente pela marca, do mais novo ao mais
 * antigo. Sem isso a antirrepetição só valeria dentro de uma sessão.
 */
export async function getRecentLayoutUsage(brandId, limit = RECENT_LAYOUT_WINDOW) {
  if (!brandId) return { recentStructures: [], recentStyles: [] };
  const supabase = await createClient();
  const rows = await safeQuery(() => supabase
    .from('layout_usage')
    .select('structure_id, style_id, used_at')
    .eq('brand_id', brandId)
    .order('used_at', { ascending: false })
    .limit(limit));

  return {
    recentStructures: rows.map((row) => row.structure_id).filter(Boolean),
    recentStyles: rows.map((row) => row.style_id).filter(Boolean)
  };
}

export async function listLayoutTemplates(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  return safeQuery(() => supabase
    .from('layout_templates')
    .select('id, name, format, ratio, category, structure_id, style_id, template, updated_at')
    .eq('brand_id', brandId)
    .eq('status', 'ativo')
    .order('updated_at', { ascending: false })
    .limit(60));
}
