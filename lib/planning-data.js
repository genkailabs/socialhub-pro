import { createClient } from '@/lib/supabase/server';
import { planningWindowStart } from '@/lib/strategy-plan';
import { normalizePlanningItemStatus } from '@/lib/planning-status';
import { resolveSuggestedTime } from '@/lib/planning-times';

// O componente recebe uma chave estável (`versions`) sem depender do nome do
// relacionamento do PostgREST. Assim o seletor de restauração sempre trabalha
// com as versões realmente retornadas pelo banco.
export function attachPlanningItemVersions(items = []) {
  return items.map(({ editorial_plan_item_versions: versions, ...item }) => ({
    ...item,
    status: normalizePlanningItemStatus(item.status),
    versions: versions || []
  }));
}

// Quantos temas a marca já planejou, em qualquer semana. Usado pela barra de
// progresso do onboarding para saber se o passo "Planejar semana" foi cumprido.
export async function countPlanItemsForBrand(brandId) {
  if (!brandId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from('editorial_plan_items')
    .select('id, editorial_plans!inner(brand_id)', { count: 'exact', head: true })
    .eq('editorial_plans.brand_id', brandId);
  return count || 0;
}

export async function listStrategies(brandId) {
  if (!brandId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('content_strategies')
    .select('id, period_start, period_end, objectives, pillars, formats, frequency, indicators, rationale, status, approved_at, created_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  return data || [];
}

// Plano da semana com os temas. Sem plano ainda, devolve null — a tela mostra o
// convite para gerar em vez de uma lista vazia sem explicação.
export async function getWeekPlan(brandId, weekStart) {
  if (!brandId) return null;
  const supabase = await createClient();
  const semana = weekStart || planningWindowStart();

  const { data: plan } = await supabase
    .from('editorial_plans')
    .select('id, week_start, status, strategy_id, weekly_summary, created_at')
    .eq('brand_id', brandId)
    .eq('week_start', semana)
    .maybeSingle();

  if (!plan) return null;

  const { data: items } = await supabase
    .from('editorial_plan_items')
    .select('id, date, suggested_time, format, topic, title, objective, pillar, stage, summary, hook, cta, target_audience, estimated_duration, rationale, status, regeneration_count, production_error, position, post_id, editorial_plan_item_versions(id, version_number)')
    .eq('plan_id', plan.id)
    .order('date', { ascending: true })
    .order('position', { ascending: true });

  // MVP V2 §20: as colunas "Agendados" e "Publicados" dependem do estado do
  // POST, não do item de planejamento. Buscamos em consulta separada em vez de
  // recurso embutido: não depende do nome da FK, que aqui diverge das migrations.
  const withVersions = attachPlanningItemVersions(items || []);
  const postIds = [...new Set(withVersions.map((i) => i.post_id).filter(Boolean))];
  let postById = new Map();
  if (postIds.length) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, status, scheduled_at')
      .in('id', postIds);
    postById = new Map((posts || []).map((p) => [p.id, p]));
  }

  return {
    ...plan,
    items: withVersions.map((item, idx) => {
      const post = item.post_id ? postById.get(item.post_id) : null;
      const resolvedTime = resolveSuggestedTime({ date: item.date, aiTime: item.suggested_time, index: idx }) || item.suggested_time;
      return { ...item, suggested_time: resolvedTime, post_status: post?.status || null, post_scheduled_at: post?.scheduled_at || null };
    })
  };
}
