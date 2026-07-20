// Teto de uso de IA por marca (PRD §12.5/§12.6). Os números vivem na tabela
// ai_limits, nunca no código: cada plano/marca pode ter o seu.
//
// Uma linha com brand_id NULL é o padrão global; uma linha com brand_id vence o
// padrão. Skill sem linha nenhuma não tem limite.

const PERIOD_LABEL = { day: 'dia', month: 'mes' };

export function periodStart(period, now = new Date()) {
  const d = new Date(now);
  if (period === 'day') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// Uso corrente de uma skill no período, para exibir "X de Y gerações usadas"
// (RF-05). Reaproveita a mesma fonte do checkLimit: ai_limits + generation_jobs.
// Sem limite configurado, max/remaining voltam null (só mostramos o usado).
export async function usageForSkill({ supabase, brandId, skillId, now = new Date() }) {
  try {
    const { data: rows } = await supabase
      .from('ai_limits')
      .select('brand_id, skill_id, period, max_runs')
      .eq('skill_id', skillId)
      .in('brand_id', [brandId, null]);

    const rule = rows?.find((r) => r.brand_id === brandId) || rows?.find((r) => r.brand_id === null) || null;
    const period = rule?.period || 'month';
    const max = Number.isFinite(rule?.max_runs) ? rule.max_runs : null;

    const since = periodStart(period, now);
    const { count } = await supabase
      .from('generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('skill_id', skillId)
      .eq('status', 'success')
      .gte('created_at', since);

    const used = count || 0;
    return { used, max, period, remaining: max == null ? null : Math.max(0, max - used) };
  } catch {
    return { used: 0, max: null, period: 'month', remaining: null };
  }
}

export async function checkLimit({ supabase, brandId, skillId, now = new Date() }) {
  try {
    const { data: rows } = await supabase
      .from('ai_limits')
      .select('brand_id, skill_id, period, max_runs')
      .eq('skill_id', skillId)
      .in('brand_id', [brandId, null]);

    if (!rows?.length) return { allowed: true };

    // Específico da marca ganha do padrão global.
    const rule = rows.find((r) => r.brand_id === brandId) || rows.find((r) => r.brand_id === null);
    if (!rule || !Number.isFinite(rule.max_runs)) return { allowed: true };

    const since = periodStart(rule.period, now);
    const { count } = await supabase
      .from('generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('skill_id', skillId)
      .eq('status', 'success')
      .gte('created_at', since);

    const used = count || 0;
    if (used >= rule.max_runs) {
      const label = PERIOD_LABEL[rule.period] || rule.period;
      return {
        allowed: false,
        reason: `Limite de IA atingido: ${rule.max_runs} por ${label} para esta acao. Tente novamente no proximo periodo.`
      };
    }
    return { allowed: true };
  } catch {
    // A checagem é uma proteção, não um portão: se ela quebrar, a geração segue
    // e o custo continua registrado e visível em /ai-costs.
    return { allowed: true };
  }
}
