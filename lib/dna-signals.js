import 'server-only';
import { createClient } from '@/lib/supabase/server';

const ACTIONS = new Set(['approve', 'reject', 'edit']);

// Grava um sinal leve de aprendizado (aprovar/rejeitar/editar). Best-effort:
// nunca bloqueia o fluxo chamador — a RLS de dna_signals é do dono da marca.
export async function recordDnaSignal({ brandId, postId = null, action }) {
  if (!brandId || !ACTIONS.has(action)) return;
  try {
    const supabase = await createClient();
    await supabase.from('dna_signals').insert({ brand_id: brandId, post_id: postId, action });
  } catch {}
}

// Resumo dos sinais recentes p/ contextualizar a próxima análise de DNA.
// Retorna null quando não há sinais (mantém o prompt enxuto).
export async function summarizeDnaSignals(brandId, limit = 50) {
  if (!brandId) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('dna_signals')
      .select('action')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!data?.length) return null;
    const c = { approve: 0, reject: 0, edit: 0 };
    for (const r of data) if (c[r.action] !== undefined) c[r.action]++;
    return c;
  } catch { return null; }
}
