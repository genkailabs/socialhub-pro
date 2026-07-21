// Regras de consumo do Assistente de Marketing. O plano fica no banco para que
// a equipe possa ajustar a margem sem publicar uma nova versao do aplicativo.

export const LIMIT_REACHED_MESSAGE = 'Voce utilizou todas as producoes incluidas neste periodo. Ainda e possivel criar e editar conteudos manualmente.';

export function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function selectedPlan(rows, planKey) {
  return rows?.find((row) => row.plan_key === planKey) || rows?.find((row) => row.plan_key === 'essencial') || null;
}

// Cria a reserva antes da chamada cara. Somente pacotes concluídos contam no
// limite; um erro interno fica auditável, mas não desconta a franquia.
export async function beginProductionPackage({ supabase, brandId, userId, recommendationId = null, now = new Date() }) {
  const { data: assignments } = await supabase
    .from('brand_ai_plans')
    .select('plan_key')
    .eq('brand_id', brandId)
    .limit(1);
  const planKey = assignments?.[0]?.plan_key || 'essencial';

  const { data: plans, error: planError } = await supabase
    .from('ai_plan_limits')
    .select('plan_key, productions_per_month, images_per_content, research_policy')
    .in('plan_key', [planKey, 'essencial']);
  if (planError) throw new Error(`Nao foi possivel consultar seu plano: ${planError.message}`);
  const plan = selectedPlan(plans, planKey);
  if (!plan) throw new Error('Seu plano de producao ainda nao foi configurado.');

  const { count, error: countError } = await supabase
    .from('ai_production_packages')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('status', 'completed')
    .gte('created_at', monthStart(now));
  if (countError) throw new Error(`Nao foi possivel conferir seu limite: ${countError.message}`);
  if ((count || 0) >= plan.productions_per_month) return { allowed: false, message: LIMIT_REACHED_MESSAGE, plan };

  const { data: productionPackage, error } = await supabase
    .from('ai_production_packages')
    .insert({
      brand_id: brandId,
      user_id: userId,
      recommendation_id: recommendationId,
      plan_key: plan.plan_key,
      image_limit: plan.images_per_content,
      research_allowed: plan.research_policy !== 'none',
      status: 'processing'
    })
    .select('id, image_limit, research_allowed')
    .single();
  if (error) throw new Error(`Nao foi possivel iniciar a producao: ${error.message}`);
  return { allowed: true, productionPackage, plan };
}

export async function finishProductionPackage({ supabase, packageId, status, imageCount = 0, error = null }) {
  if (!packageId) return;
  await supabase.from('ai_production_packages').update({
    status,
    image_count: imageCount,
    error: error ? String(error).slice(0, 500) : null,
    completed_at: new Date().toISOString()
  }).eq('id', packageId);
}
