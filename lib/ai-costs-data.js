import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { costPeriodStart } from '@/lib/ai-costs-labels';

export const COST_PAGE_SIZE = 50;
// Teto para os agregados: os cartões refletem o conjunto filtrado até aqui,
// sem carregar o histórico inteiro. Suficiente para o volume de um dono só.
const SUMMARY_CAP = 2000;

export async function getAICostsSummary({ brandId = null, skillId = null, period = 'all', page = 1 } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado', jobs: [] };

  const since = costPeriodStart(period);
  const safePage = Math.max(1, Number(page) || 1);
  const from = (safePage - 1) * COST_PAGE_SIZE;

  // Colunas novas (ação/tentativa/cobrança) vêm da migração 20260718. Se o banco
  // ainda não as tiver, a query inteira falharia — então tentamos com elas e, em
  // caso de erro, caímos para as colunas garantidas. A tela degrada sem quebrar.
  const DETAILED = 'id, brand_id, kind, skill_id, ref_post_id, retry_attempt, charged, research_performed, provider, model, input_tokens, output_tokens, cost_usd, status, error, created_at, brands(name, color)';
  const BASE = 'id, brand_id, kind, provider, model, input_tokens, output_tokens, cost_usd, status, error, created_at, brands(name, color)';

  const fetchPage = (select, withSkillFilter) => {
    let q = supabase.from('generation_jobs').select(select).order('created_at', { ascending: false }).range(from, from + COST_PAGE_SIZE - 1);
    if (brandId) q = q.eq('brand_id', brandId);
    if (withSkillFilter && skillId) q = q.eq('skill_id', skillId);
    if (since) q = q.gte('created_at', since);
    return q;
  };

  let degraded = false;
  let { data: pageData, error } = await fetchPage(DETAILED, true);
  if (error) {
    // Provável coluna ausente: refaz sem as colunas/filtro novos.
    degraded = true;
    ({ data: pageData, error } = await fetchPage(BASE, false));
  }
  if (error) return { ok: false, error: error.message, jobs: [] };

  // Filtros para count/agregado, consistentes com o que a página conseguiu ler.
  const applyFilters = (q) => {
    let query = q;
    if (brandId) query = query.eq('brand_id', brandId);
    if (!degraded && skillId) query = query.eq('skill_id', skillId);
    if (since) query = query.gte('created_at', since);
    return query;
  };

  // Total real para o paginador.
  const { count: total } = await applyFilters(
    supabase.from('generation_jobs').select('id', { count: 'exact', head: true })
  );

  // Agregados sobre o conjunto filtrado (até o teto), para os cartões refletirem
  // os filtros e não apenas a página visível.
  const { data: aggData } = await applyFilters(
    supabase
      .from('generation_jobs')
      .select('provider, kind, cost_usd, input_tokens, output_tokens, status')
      .order('created_at', { ascending: false })
      .limit(SUMMARY_CAP)
  );

  let totalUsd = 0, deepseekUsd = 0, imageUsd = 0, researchUsd = 0;
  let totalInputTokens = 0, totalOutputTokens = 0;
  let deepseekCount = 0, imageCount = 0, researchCount = 0, errorCount = 0;

  for (const job of aggData || []) {
    const cost = Number(job.cost_usd) || 0;
    totalUsd += cost;
    if (job.status === 'error') errorCount++;
    if (job.provider === 'deepseek') {
      deepseekUsd += cost;
      deepseekCount++;
      totalInputTokens += Number(job.input_tokens) || 0;
      totalOutputTokens += Number(job.output_tokens) || 0;
    } else if (job.kind === 'research') {
      researchUsd += cost;
      researchCount++;
    } else {
      imageUsd += cost;
      imageCount++;
    }
  }

  return {
    ok: true,
    summary: {
      totalUsd: Math.round(totalUsd * 1e6) / 1e6,
      deepseekUsd: Math.round(deepseekUsd * 1e6) / 1e6,
      imageUsd: Math.round(imageUsd * 1e6) / 1e6,
      researchUsd: Math.round(researchUsd * 1e6) / 1e6,
      totalInputTokens,
      totalOutputTokens,
      deepseekCount,
      imageCount,
      researchCount,
      errorCount,
      totalJobs: total || 0
    },
    jobs: pageData || [],
    total: total || 0,
    page: safePage,
    pageSize: COST_PAGE_SIZE
  };
}
