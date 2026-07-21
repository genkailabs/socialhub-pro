import 'server-only';

// Histórico de formato/tom/objetivo usados por marca — alimenta as sugestões
// do FreeInput no Composer (mais usados primeiro). Best-effort: erro aqui
// nunca deve travar a geração de conteúdo, só perde a personalização.
export async function recordBrandPreference({ supabase, brandId, type, value }) {
  const v = String(value || '').trim();
  if (!brandId || !type || !v) return;
  try {
    // RPC (não upsert direto): incrementa usage_count atomicamente no banco —
    // ON CONFLICT DO UPDATE de um upsert simples só sobrescreveria a coluna.
    await supabase.rpc('record_brand_preference', { p_brand_id: brandId, p_type: type, p_value: v });
  } catch { /* histórico é conveniência, não bloqueia o fluxo principal */ }
}

export async function listBrandPreferences({ supabase, brandId, type, limit = 6 }) {
  if (!brandId || !type) return [];
  try {
    const { data } = await supabase
      .from('brand_preferences')
      .select('value, usage_count, last_used')
      .eq('brand_id', brandId)
      .eq('preference_type', type)
      .order('usage_count', { ascending: false })
      .order('last_used', { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}
