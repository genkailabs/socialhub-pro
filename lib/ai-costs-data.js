import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getAICostsSummary(brandId = null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado', jobs: [] };

  let query = supabase
    .from('generation_jobs')
    .select('id, brand_id, kind, provider, model, input_tokens, output_tokens, cost_usd, status, error, created_at, brands(name, color)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (brandId) {
    query = query.eq('brand_id', brandId);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, error: error.message, jobs: [] };
  }

  const jobs = data || [];

  let totalUsd = 0;
  let deepseekUsd = 0;
  let deapiUsd = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let deepseekCount = 0;
  let deapiCount = 0;
  let errorCount = 0;

  for (const job of jobs) {
    const cost = Number(job.cost_usd) || 0;
    totalUsd += cost;
    if (job.status === 'error') {
      errorCount++;
    }
    if (job.provider === 'deepseek') {
      deepseekUsd += cost;
      deepseekCount++;
      totalInputTokens += Number(job.input_tokens) || 0;
      totalOutputTokens += Number(job.output_tokens) || 0;
    } else if (job.provider === 'deapi') {
      deapiUsd += cost;
      deapiCount++;
    }
  }

  return {
    ok: true,
    summary: {
      totalUsd: Math.round(totalUsd * 1e6) / 1e6,
      deepseekUsd: Math.round(deepseekUsd * 1e6) / 1e6,
      deapiUsd: Math.round(deapiUsd * 1e6) / 1e6,
      totalInputTokens,
      totalOutputTokens,
      deepseekCount,
      deapiCount,
      errorCount,
      totalJobs: jobs.length
    },
    jobs
  };
}
