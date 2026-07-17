'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchInstagramProfile, fetchInstagramMedia } from '@/lib/meta/graph';
import { fetchInstagramInsights } from '@/lib/meta/insights';
import { buildAuditSummary } from '@/lib/meta/audit';
import { getFollowerHistory } from '@/lib/metrics-data';
import { runSkill } from '@/lib/ai/skills/run';
import { instagramAuditSkill } from '@/lib/ai/skills/instagram-audit';

const MEDIA_SAMPLE = 25;

// Diagnóstico do Instagram (PRD Etapa 4 / §11.1): buscar dados -> calcular
// métricas -> chamar a skill -> salvar. A ordem importa: a IA só entra depois
// que o código já mediu tudo, e recebe apenas o resumo (§6.3).
export async function runInstagramAudit({ brandId }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id, platform_username')
    .eq('brand_id', brandId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  try {
    const [profile, media] = await Promise.all([
      fetchInstagramProfile(token.platform_user_id, token.access_token),
      fetchInstagramMedia(token.platform_user_id, token.access_token, MEDIA_SAMPLE)
    ]);

    // Insights dependem de permissão extra: null aqui é esperado, não erro.
    const insights = await fetchInstagramInsights(token.platform_user_id, token.access_token);
    const followerHistory = await getFollowerHistory(brandId, 30);

    const summary = buildAuditSummary({
      profile: {
        username: profile.username || token.platform_username || '',
        biography: profile.biography || '',
        followers: profile.followers_count || 0,
        mediaCount: profile.media_count || media.length
      },
      media,
      followerHistory,
      insights
    });

    const { data: analysis, cost } = await runSkill({
      skill: instagramAuditSkill,
      input: { summary },
      supabase,
      brandId,
      userId: user.id
    });

    const { error } = await supabase.from('instagram_audits').insert({
      brand_id: brandId,
      source_snapshot: { profile, media, insights },
      calculated_metrics: summary,
      ai_analysis: analysis,
      confidence: analysis.confidence,
      unavailable: summary.unavailable,
      skill_version: instagramAuditSkill.version
    });
    // O diagnóstico já foi pago: falha ao salvar não pode descartá-lo em
    // silêncio, mas também não invalida o que está na tela.
    if (error) return { ok: true, summary, analysis, cost, warning: `Diagnóstico gerado, mas não foi possível salvar: ${error.message}` };

    revalidatePath('/instagram/diagnostico');
    revalidatePath('/dashboard');
    return { ok: true, summary, analysis, cost };
  } catch (e) {
    return { error: e.message };
  }
}
