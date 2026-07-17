'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { runSkill } from '@/lib/ai/skills/run';
import { contentStrategySkill } from '@/lib/ai/skills/content-strategy';
import { monthPeriod } from '@/lib/strategy-plan';
import { getLatestAudit } from '@/lib/instagram-audit-data';

// Gera uma PROPOSTA de estratégia (PRD Etapa 8 / RF-05). Como no Brand DNA, a IA
// propõe e o usuário aprova — nada entra em vigor sozinho.
export async function generateStrategy({ brandId }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: brand } = await supabase.from('brands').select('id, name').eq('id', brandId).maybeSingle();
  if (!brand) return { error: 'Marca inválida.' };

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('niche, audience, tone, pillars, donts, objective, dna_generated_at')
    .eq('brand_id', brandId)
    .maybeSingle();

  // A estratégia nasce do DNA aprovado: sem ele, seria chute com sotaque de IA.
  if (!kit?.dna_generated_at) {
    return { error: 'Aprove o Brand DNA antes de criar a estratégia — é ele que diz quem a marca é.' };
  }

  const { data: plan } = await supabase
    .from('content_plans')
    .select('posts_per_day')
    .eq('brand_id', brandId)
    .maybeSingle();

  // Responde ao perfil real quando existe diagnóstico.
  const audit = await getLatestAudit(brandId);
  const auditPriorities = (audit?.ai_analysis?.priorities || []).slice(0, 3);

  try {
    const { data: strategy, cost } = await runSkill({
      skill: contentStrategySkill,
      input: {
        brandName: brand.name,
        dna: {
          niche: kit.niche || '',
          audience: kit.audience || '',
          tone: kit.tone || '',
          pillars: kit.pillars || [],
          objective: kit.objective || '',
          donts: kit.donts || []
        },
        auditPriorities,
        postsPerWeek: Math.max(1, Math.min(21, (plan?.posts_per_day || 1) * 7)),
        periodLabel: 'proximo mes'
      },
      supabase,
      brandId,
      userId: user.id
    });

    const { periodStart, periodEnd } = monthPeriod();
    const { data: row, error } = await supabase.from('content_strategies').insert({
      brand_id: brandId,
      period_start: periodStart,
      period_end: periodEnd,
      objectives: { main: strategy.mainObjective, secondary: strategy.secondaryObjectives, audience: strategy.targetAudience, proposal: strategy.editorialProposal },
      pillars: strategy.pillars,
      formats: strategy.formats,
      frequency: { postsPerWeek: strategy.postsPerWeek, balance: strategy.balance },
      indicators: strategy.indicators,
      rationale: strategy.rationale,
      status: 'proposed',
      skill_version: contentStrategySkill.version
    }).select('id').maybeSingle();

    if (error) return { ok: true, strategy, cost, warning: `Estratégia gerada, mas não foi possível salvar: ${error.message}` };

    revalidatePath('/autopilot');
    return { ok: true, id: row?.id, strategy, cost };
  } catch (e) {
    return { error: e.message };
  }
}

// Aprovar torna a estratégia ativa. Uma por marca — o banco garante.
export async function approveStrategy({ brandId, strategyId }) {
  if (!brandId || !strategyId) return { error: 'Estratégia não informada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: strategy } = await supabase
    .from('content_strategies')
    .select('id, status')
    .eq('id', strategyId)
    .eq('brand_id', brandId)
    .maybeSingle();
  if (!strategy) return { error: 'Estratégia não encontrada.' };
  if (strategy.status === 'approved') return { error: 'Esta estratégia já está em uso.' };

  // Arquiva a atual antes: o índice único parcial não admite duas aprovadas.
  const { error: archErr } = await supabase
    .from('content_strategies')
    .update({ status: 'archived' })
    .eq('brand_id', brandId)
    .eq('status', 'approved');
  if (archErr) return { error: `Não foi possível arquivar a anterior: ${archErr.message}` };

  const { error } = await supabase
    .from('content_strategies')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', strategyId);
  if (error) return { error: `Não foi possível aprovar: ${error.message}` };

  revalidatePath('/autopilot');
  revalidatePath('/planning');
  return { ok: true };
}
