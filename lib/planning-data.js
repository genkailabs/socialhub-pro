import { createClient } from '@/lib/supabase/server';
import { nextWeekStart } from '@/lib/strategy-plan';
import { normalizePlanningItemStatus } from '@/lib/planning-status';

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
  const semana = weekStart || nextWeekStart();

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

  return { ...plan, items: attachPlanningItemVersions(items || []) };
}
