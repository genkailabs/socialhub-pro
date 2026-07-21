import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { selectSingleRecommendation } from '@/lib/marketing-recommendations';
import { weekStartOf } from '@/lib/strategy-plan';

async function queryData(query) {
  const { data, error } = await query;
  return error ? [] : (data || []);
}

export async function getOrCreateMarketingRecommendation({ brandId, hasApprovedDna = false } = {}) {
  if (!brandId || !hasApprovedDna) return null;
  const supabase = await createClient();
  const current = await supabase.from('marketing_recommendations')
    .select('*').eq('brand_id', brandId).eq('status', 'ready')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (current.data) return current.data;

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = weekStartOf();
  const [audits, strategies, plans, learningSignals] = await Promise.all([
    queryData(supabase.from('instagram_audits').select('id, calculated_metrics, created_at').eq('brand_id', brandId).order('created_at', { ascending: false }).limit(1)),
    queryData(supabase.from('content_strategies').select('id, objectives, pillars').eq('brand_id', brandId).eq('status', 'approved').lte('period_start', today).gte('period_end', today).limit(1)),
    queryData(supabase.from('editorial_plans').select('id').eq('brand_id', brandId).eq('week_start', weekStart).eq('status', 'approved').limit(1)),
    queryData(supabase.from('publication_learning').select('comparison_percent, metric_name, baseline_value, observed_value, topic, format, pillar').eq('brand_id', brandId).eq('result_status', 'measured').order('measured_at', { ascending: false }).limit(10))
  ]);
  const planItems = plans[0]?.id
    ? await queryData(supabase.from('editorial_plan_items').select('id, title, topic, format, objective, pillar, status').eq('plan_id', plans[0].id).eq('status', 'approved').limit(10))
    : [];
  const recommendation = selectSingleRecommendation({ audit: audits[0] || null, strategy: strategies[0] || null, planItems, learningSignals, hasApprovedDna });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const inserted = await supabase.from('marketing_recommendations').insert({
    brand_id: brandId, channel: recommendation.channel, status: recommendation.status,
    title: recommendation.title, finding: recommendation.finding, meaning: recommendation.meaning,
    recommendation: recommendation.recommendation, content_plan: recommendation.contentPlan,
    evidence: recommendation.evidence, confidence: recommendation.confidence,
    source_type: recommendation.sourceType, expires_at: expiresAt
  }).select('*').single();

  // A restrição no banco mantém uma única recomendação pronta mesmo em duas
  // abas abertas; nesse caso, devolvemos a que venceu a disputa.
  if (!inserted.error) return inserted.data;
  const retry = await supabase.from('marketing_recommendations').select('*').eq('brand_id', brandId).eq('status', 'ready').order('created_at', { ascending: false }).limit(1).maybeSingle();
  // A recomendação pode ser usada mesmo se o registro não puder ser gravado
  // (por exemplo, enquanto uma migração ainda não chegou ao ambiente). Sem
  // este retorno, o Composer terminava a animação sem nada para mostrar.
  return retry.data || { ...recommendation, status: 'ready', channel: 'instagram' };
}
