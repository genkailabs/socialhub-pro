import 'server-only';

const REUSABLE_STATUSES = new Set(['ready', 'approved', 'scheduled']);
const GENERATION_LEASE_MS = 5 * 60 * 1000;
const PACKAGE_COLUMNS = [
  'id', 'brand_id', 'content_date', 'status', 'topic', 'goal', 'format', 'reason',
  'sources', 'generated_content', 'media_urls', 'alt_text', 'recommended_schedule',
  'scheduled_at', 'approved_at', 'generation_started_at', 'failure_code',
  'failure_message', 'created_at', 'updated_at'
].join(', ');

function resultError(error, fallback = 'Não foi possível preparar o conteúdo diário.') {
  return {
    error: error instanceof Error && error.name === 'DailyContentError' ? error.message : fallback,
    code: error?.code || 'daily_content_unavailable'
  };
}

function serviceError(message, code) {
  const error = new Error(message);
  error.name = 'DailyContentError';
  error.code = code;
  return error;
}

function validUtcDate(value, now) {
  if (value === undefined || value === null || value === '') return now.toISOString().slice(0, 10);
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text ? null : text;
}

function validFutureIso(value, now) {
  if (typeof value !== 'string' || !value.trim()) return { error: 'Data de agendamento inválida.', code: 'invalid_schedule' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { error: 'Data de agendamento inválida.', code: 'invalid_schedule' };
  if (parsed.getTime() <= now.getTime()) return { error: 'O agendamento deve estar no futuro.', code: 'schedule_not_future' };
  return { iso: parsed.toISOString() };
}

function packageSeed({ brandId, contentDate, opportunity }) {
  return {
    brand_id: brandId,
    content_date: contentDate,
    status: 'draft',
    topic: opportunity?.topic || null,
    goal: opportunity?.objective || opportunity?.goal || null,
    format: opportunity?.format || null,
    reason: opportunity?.reason || null,
    recommended_schedule: opportunity?.recommendedAt || null
  };
}

// Pure orchestration boundary. Production adapters are injected by the Server
// Actions; tests can prove state transitions without a database or provider.
export function createDailyContentService(dependencies) {
  const deps = dependencies || {};

  async function prepare({ brandId, contentDate } = {}) {
    if (!brandId) return { error: 'Marca não selecionada.', code: 'invalid_input' };

    let claimedPackage = null;
    try {
      const now = deps.now();
      const date = validUtcDate(contentDate, now);
      if (!date) return { error: 'Data de conteúdo inválida.', code: 'invalid_content_date' };

      const user = await deps.authenticate();
      if (!user) return { error: 'Sessão expirada.', code: 'auth_required' };

      // The production adapter uses the authenticated Supabase client. A brand
      // belonging to another user is therefore indistinguishable from missing.
      const brand = await deps.getOwnedBrand({ brandId, user });
      if (!brand) return { error: 'Marca não encontrada.', code: 'brand_not_found' };

      const existing = await deps.getPackageForDate({ brandId, contentDate: date });
      if (existing && REUSABLE_STATUSES.has(existing.status)) return { ok: true, package: existing };

      const context = await deps.loadContext({ brandId, brand, now, contentDate: date });
      const opportunity = deps.selectOpportunity({ ...context, now });
      const reservation = await deps.reservePackage({
        brandId,
        contentDate: date,
        seed: packageSeed({ brandId, contentDate: date, opportunity }),
        now
      });
      if (!reservation?.claimed) {
        if (reservation?.package && REUSABLE_STATUSES.has(reservation.package.status)) {
          return { ok: true, package: reservation.package };
        }
        return { error: 'A geração deste pacote já está em andamento.', code: 'generation_in_progress' };
      }
      claimedPackage = reservation.package;

      if (!opportunity) {
        await deps.markFailed({
          packageId: claimedPackage.id,
          generationStartedAt: claimedPackage.generation_started_at,
          code: 'opportunity_unavailable',
          message: 'Nenhuma oportunidade aprovada está disponível.',
          now
        });
        return { error: 'Nenhuma oportunidade aprovada está disponível.', code: 'opportunity_unavailable' };
      }

      let verifiedResearch = null;
      if (deps.requiresResearch(opportunity)) {
        const researched = await deps.researchOpportunity({ opportunity, brand, context });
        if (researched?.status !== 'verified' || !researched.research) {
          await deps.markFailed({
            packageId: claimedPackage.id,
            generationStartedAt: claimedPackage.generation_started_at,
            code: 'research_unavailable',
            message: 'Fontes atuais verificadas não estão disponíveis.',
            now
          });
          return { error: 'Não foi possível verificar as fontes atuais.', code: 'research_unavailable' };
        }
        verifiedResearch = researched.research;
      }

      const generated = await deps.generateContent({
        brand,
        opportunity,
        context,
        verifiedResearch
      });
      const ready = await deps.markReady({
        packageId: claimedPackage.id,
        generationStartedAt: claimedPackage.generation_started_at,
        generatedContent: generated.generatedContent,
        mediaUrls: generated.mediaUrls || [],
        altText: generated.altText || null,
        sources: verifiedResearch?.sources || [],
        now
      });
      if (!ready) throw serviceError('O pacote mudou enquanto era gerado.', 'state_conflict');
      return { ok: true, package: ready };
    } catch (error) {
      if (claimedPackage) {
        try {
          await deps.markFailed({
            packageId: claimedPackage.id,
            generationStartedAt: claimedPackage.generation_started_at,
            code: error?.code || 'generation_failed',
            message: 'Não foi possível concluir a geração.',
            now: deps.now()
          });
        } catch {}
      }
      return resultError(error);
    }
  }

  async function approve({ packageId } = {}) {
    if (!packageId) return { error: 'Pacote não informado.', code: 'invalid_input' };
    try {
      const user = await deps.authenticate();
      if (!user) return { error: 'Sessão expirada.', code: 'auth_required' };
      const current = await deps.getPackageById({ packageId });
      if (!current) return { error: 'Pacote não encontrado.', code: 'package_not_found' };
      if (current.status !== 'ready') return { error: 'Estado inválido para aprovação.', code: 'invalid_state' };
      const updated = await deps.transitionPackage({
        packageId,
        fromStatus: 'ready',
        toStatus: 'approved',
        patch: { approved_at: deps.now().toISOString() }
      });
      if (!updated) return { error: 'O pacote mudou antes da aprovação.', code: 'state_conflict' };
      return { ok: true, package: updated };
    } catch (error) {
      return resultError(error, 'Não foi possível aprovar o pacote.');
    }
  }

  async function schedule({ packageId, scheduledAt } = {}) {
    if (!packageId) return { error: 'Pacote não informado.', code: 'invalid_input' };
    const schedule = validFutureIso(scheduledAt, deps.now());
    if (!schedule.iso) return schedule;
    try {
      const user = await deps.authenticate();
      if (!user) return { error: 'Sessão expirada.', code: 'auth_required' };
      const current = await deps.getPackageById({ packageId });
      if (!current) return { error: 'Pacote não encontrado.', code: 'package_not_found' };
      if (current.status !== 'approved') return { error: 'Estado inválido para agendamento.', code: 'invalid_state' };
      const updated = await deps.transitionPackage({
        packageId,
        fromStatus: 'approved',
        toStatus: 'scheduled',
        patch: { scheduled_at: schedule.iso }
      });
      if (!updated) return { error: 'O pacote mudou antes do agendamento.', code: 'state_conflict' };
      return { ok: true, package: updated };
    } catch (error) {
      return resultError(error, 'Não foi possível agendar o pacote.');
    }
  }

  return { prepare, approve, schedule };
}

function throwQueryError(error) {
  if (error) throw error;
}

export async function getOwnedBrand({ supabase, brandId }) {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, color')
    .eq('id', brandId)
    .maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function getDailyContentPackage({ supabase, brandId, contentDate }) {
  const { data, error } = await supabase
    .from('daily_content_packages')
    .select(PACKAGE_COLUMNS)
    .eq('brand_id', brandId)
    .eq('content_date', contentDate)
    .maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function getDailyContentPackageById({ supabase, packageId }) {
  const { data, error } = await supabase
    .from('daily_content_packages')
    .select(PACKAGE_COLUMNS)
    .eq('id', packageId)
    .maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function reserveDailyContentPackage({ supabase, brandId, contentDate, seed, now }) {
  const startedAt = now.toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from('daily_content_packages')
    .insert({ ...seed, generation_started_at: startedAt, updated_at: startedAt })
    .select(PACKAGE_COLUMNS)
    .maybeSingle();
  if (!insertError && inserted) return { claimed: true, package: inserted };
  if (insertError?.code !== '23505') throwQueryError(insertError);

  const existing = await getDailyContentPackage({ supabase, brandId, contentDate });
  if (!existing || REUSABLE_STATUSES.has(existing.status)) return { claimed: false, package: existing };
  if (!['draft', 'failed'].includes(existing.status)) return { claimed: false, package: existing };

  let claim = supabase
    .from('daily_content_packages')
    .update({ ...seed, status: 'draft', generation_started_at: startedAt, failure_code: null, failure_message: null, updated_at: startedAt })
    .eq('id', existing.id)
    .eq('status', existing.status);
  if (existing.status === 'draft') {
    const leaseCutoff = new Date(now.getTime() - GENERATION_LEASE_MS).toISOString();
    claim = claim.or(`generation_started_at.is.null,generation_started_at.lt.${leaseCutoff}`);
  }
  const { data: reserved, error } = await claim.select(PACKAGE_COLUMNS).maybeSingle();
  throwQueryError(error);
  return { claimed: Boolean(reserved), package: reserved || await getDailyContentPackage({ supabase, brandId, contentDate }) };
}

export async function markDailyContentReady({
  supabase, packageId, generationStartedAt, generatedContent, mediaUrls, altText, sources, now
}) {
  let query = supabase
    .from('daily_content_packages')
    .update({
      status: 'ready',
      generated_content: generatedContent || {},
      media_urls: mediaUrls || [],
      alt_text: altText,
      sources: sources || [],
      generation_started_at: null,
      failure_code: null,
      failure_message: null,
      updated_at: now.toISOString()
    })
    .eq('id', packageId)
    .eq('status', 'draft');
  if (generationStartedAt) query = query.eq('generation_started_at', generationStartedAt);
  const { data, error } = await query.select(PACKAGE_COLUMNS).maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function markDailyContentFailed({ supabase, packageId, generationStartedAt, code, message, now }) {
  let query = supabase
    .from('daily_content_packages')
    .update({
      status: 'failed',
      generation_started_at: null,
      failure_code: String(code || 'generation_failed').slice(0, 80),
      failure_message: String(message || 'Não foi possível preparar o conteúdo.').slice(0, 500),
      updated_at: now.toISOString()
    })
    .eq('id', packageId)
    .eq('status', 'draft');
  if (generationStartedAt) query = query.eq('generation_started_at', generationStartedAt);
  const { data, error } = await query.select(PACKAGE_COLUMNS).maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function transitionDailyContentPackage({ supabase, packageId, fromStatus, toStatus, patch = {}, now }) {
  const { data, error } = await supabase
    .from('daily_content_packages')
    .update({ ...patch, status: toStatus, updated_at: now.toISOString() })
    .eq('id', packageId)
    .eq('status', fromStatus)
    .select(PACKAGE_COLUMNS)
    .maybeSingle();
  throwQueryError(error);
  return data || null;
}
