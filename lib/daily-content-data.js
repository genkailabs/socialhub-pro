import 'server-only';

const REUSABLE_STATUSES = new Set(['ready', 'approved', 'scheduled']);
const CLAIM_TTL_MS = 5 * 60 * 1000;
const PACKAGE_COLUMNS = [
  'id', 'brand_id', 'content_date', 'status', 'topic', 'goal', 'format', 'reason',
  'sources', 'evidence', 'generated_content', 'media_urls', 'alt_text', 'recommended_schedule',
  'scheduled_at', 'approved_at', 'approved_by', 'generation_started_at', 'claim_token',
  'claim_heartbeat_at', 'claim_expires_at', 'cleanup_pending_paths', 'cleanup_error',
  'failure_code', 'failure_message', 'created_at', 'updated_at'
].join(', ');

function resultError(error, fallback = 'Não foi possível preparar o conteúdo diário.') {
  const result = {
    error: error instanceof Error && error.name === 'DailyContentError' ? error.message : fallback,
    code: error?.code || 'daily_content_unavailable'
  };
  if (error?.details) result.details = error.details;
  return result;
}

function serviceError(message, code, details) {
  const error = new Error(message);
  error.name = 'DailyContentError';
  error.code = code;
  if (details) error.details = details;
  return error;
}

function cleanupPaths(value) {
  return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];
}

function isDailyGeneratedMediaPath(path, brandId) {
  const parts = String(path).split('/');
  return parts.length === 4
    && parts[0] === String(brandId)
    && parts[1] === 'daily'
    && /^[a-z0-9_-]+$/i.test(parts[2])
    && /^ai-[0-9]+-[0-9]+\.(png|jpg)$/i.test(parts[3]);
}

function isPersistableDailyCleanupPath(path, brandId) {
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  return new RegExp(`^${uuid}/daily/${uuid}/ai-[0-9]+-[0-9]+\\.(png|jpg)$`, 'i').test(String(path))
    && String(path).startsWith(`${brandId}/`);
}

function cleanupJobPaths(jobs) {
  return cleanupPaths((jobs || []).map((job) => typeof job === 'string' ? job : job?.storage_path));
}

function cleanupDetails(paths) {
  return {
    cleanup: {
      pendingPaths: cleanupPaths(paths),
      error: 'Não foi possível remover as mídias geradas.'
    }
  };
}

function claimIsLive(pkg, now) {
  const expiresAt = new Date(pkg?.claim_expires_at).getTime();
  return pkg?.status === 'draft' && pkg?.claim_token
    && !Number.isNaN(expiresAt) && expiresAt > now.getTime();
}

function packageEvidence(opportunity, verifiedResearch) {
  if (verifiedResearch) {
    return { kind: 'verified-research', sourceCount: verifiedResearch.sources?.length || 0 };
  }
  return {
    kind: 'internal',
    source: opportunity?.reason || opportunity?.sourceRequirement || 'approved-context'
  };
}

function validUtcDate(value, now) {
  if (value === undefined || value === null || value === '') return now.toISOString().slice(0, 10);
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text ? null : text;
}

function validFutureIso(value, now) {
  const strictIsoWithTimezone = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/;
  const match = typeof value === 'string' ? value.match(strictIsoWithTimezone) : null;
  if (!match) {
    return { error: 'Data de agendamento inválida.', code: 'invalid_schedule' };
  }
  const [, year, month, day, hour, minute, second, , offsetHour = '00', offsetMinute = '00'] = match;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const invalidParts = Number(month) < 1 || Number(month) > 12
    || Number(day) < 1 || Number(day) > daysInMonth
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
    || Number(offsetHour) > 23 || Number(offsetMinute) > 59;
  if (invalidParts) return { error: 'Data de agendamento inválida.', code: 'invalid_schedule' };
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
    let heartbeat = null;
    let generated = null;

    const stopHeartbeat = async () => {
      if (!heartbeat) return true;
      const current = heartbeat;
      heartbeat = null;
      return current.stop();
    };

    const persistFailure = async ({ error, now }) => {
      const paths = cleanupPaths(generated?.mediaPaths || error?.cleanupPendingPaths);
      let details = null;
      let safeToDelete = false;
      if (paths.length) {
        safeToDelete = claimedPackage
          && paths.every((path) => isDailyGeneratedMediaPath(path, claimedPackage.brand_id));
        if (!safeToDelete) {
          details = cleanupDetails(paths);
        } else {
          try {
            await deps.cleanupMedia({ paths });
          } catch {
            details = cleanupDetails(paths);
          }
        }
      }

      if (details && safeToDelete) {
        try {
          await deps.recordCleanupFailure({
            brandId: claimedPackage.brand_id,
            paths: details.cleanup.pendingPaths,
            error: details.cleanup.error
          });
        } catch {}
      }

      if (claimedPackage) {
        try {
          await deps.markFailed({
            packageId: claimedPackage.id,
            claimToken: claimedPackage.claim_token,
            code: error?.code || 'generation_failed',
            message: 'Não foi possível concluir a geração.',
            cleanupPendingPaths: details?.cleanup.pendingPaths || [],
            cleanupError: details?.cleanup.error || null,
            now
          });
        } catch {}
      }
      if (details) error.details = details;
    };

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

      const orphanPaths = cleanupJobPaths(await deps.getCleanupJobs({ brandId }));
      if (orphanPaths.length) {
        const details = cleanupDetails(orphanPaths);
        if (!orphanPaths.every((path) => isDailyGeneratedMediaPath(path, brandId))) {
          return {
            error: 'Ainda há mídias órfãs aguardando limpeza.',
            code: 'cleanup_pending',
            details
          };
        }
        try {
          await deps.cleanupMedia({ paths: orphanPaths });
          const cleared = await deps.clearCleanupJobs({ brandId, paths: orphanPaths });
          if (!cleared) throw new Error('cleanup job changed');
        } catch {
          try {
            await deps.recordCleanupFailure({
              brandId,
              paths: orphanPaths,
              error: details.cleanup.error
            });
          } catch {}
          return {
            error: 'Ainda há mídias órfãs aguardando limpeza.',
            code: 'cleanup_pending',
            details
          };
        }
      }

      let existing = await deps.getPackageForDate({ brandId, contentDate: date });
      const pendingCleanup = cleanupPaths(existing?.cleanup_pending_paths);
      if (pendingCleanup.length) {
        if (!pendingCleanup.every((path) => isDailyGeneratedMediaPath(path, brandId))) {
          return {
            error: 'Ainda há mídias órfãs aguardando limpeza.',
            code: 'cleanup_pending',
            details: cleanupDetails(pendingCleanup)
          };
        }
        try {
          await deps.cleanupMedia({ paths: pendingCleanup });
          await deps.clearCleanupFailure({ packageId: existing.id, paths: pendingCleanup });
          existing = { ...existing, cleanup_pending_paths: [], cleanup_error: null };
        } catch {
          const details = cleanupDetails(pendingCleanup);
          try {
            await deps.recordCleanupFailure({
              brandId,
              paths: pendingCleanup,
              error: details.cleanup.error
            });
          } catch {}
          return {
            error: 'Ainda há mídias órfãs aguardando limpeza.',
            code: 'cleanup_pending',
            details
          };
        }
      }
      if (existing && REUSABLE_STATUSES.has(existing.status)) return { ok: true, package: existing };
      if (claimIsLive(existing, now)) {
        return { error: 'A geração deste pacote já está em andamento.', code: 'generation_in_progress' };
      }

      const context = await deps.loadContext({ brandId, brand, now, contentDate: date });
      const opportunity = deps.selectOpportunity({ ...context, now });
      const claimToken = deps.createClaimToken();
      const reservation = await deps.reservePackage({
        brandId,
        contentDate: date,
        seed: packageSeed({ brandId, contentDate: date, opportunity }),
        existingPackage: existing,
        claimToken,
        now
      });
      if (!reservation?.claimed) {
        if (reservation?.package && REUSABLE_STATUSES.has(reservation.package.status)) {
          return { ok: true, package: reservation.package };
        }
        return { error: 'A geração deste pacote já está em andamento.', code: 'generation_in_progress' };
      }
      claimedPackage = reservation.package;
      heartbeat = await deps.startHeartbeat({
        packageId: claimedPackage.id,
        claimToken: claimedPackage.claim_token
      });
      if (heartbeat?.owned === false) {
        throw serviceError('O pacote mudou enquanto era gerado.', 'state_conflict');
      }

      if (!opportunity) {
        await stopHeartbeat();
        await deps.markFailed({
          packageId: claimedPackage.id,
          claimToken: claimedPackage.claim_token,
          code: 'opportunity_unavailable',
          message: 'Nenhuma oportunidade aprovada está disponível.',
          cleanupPendingPaths: [],
          cleanupError: null,
          now
        });
        return { error: 'Nenhuma oportunidade aprovada está disponível.', code: 'opportunity_unavailable' };
      }

      let verifiedResearch = null;
      if (deps.requiresResearch(opportunity)) {
        const researched = await deps.researchOpportunity({ opportunity, brand, context });
        if (researched?.status !== 'verified' || !researched.research) {
          await stopHeartbeat();
          await deps.markFailed({
            packageId: claimedPackage.id,
            claimToken: claimedPackage.claim_token,
            code: 'research_unavailable',
            message: 'Fontes atuais verificadas não estão disponíveis.',
            cleanupPendingPaths: [],
            cleanupError: null,
            now
          });
          return { error: 'Não foi possível verificar as fontes atuais.', code: 'research_unavailable' };
        }
        verifiedResearch = researched.research;
      }

      generated = await deps.generateContent({
        brand,
        opportunity,
        context,
        verifiedResearch,
        mediaNamespace: `daily/${claimedPackage.claim_token}`
      });
      const stillOwned = await stopHeartbeat();
      if (!stillOwned) throw serviceError('O pacote mudou enquanto era gerado.', 'state_conflict');
      const ready = await deps.markReady({
        packageId: claimedPackage.id,
        claimToken: claimedPackage.claim_token,
        generatedContent: generated.generatedContent,
        mediaUrls: generated.mediaUrls || [],
        mediaPaths: generated.mediaPaths || [],
        altText: generated.altText || null,
        sources: verifiedResearch?.sources || [],
        evidence: packageEvidence(opportunity, verifiedResearch),
        now
      });
      if (!ready) throw serviceError('O pacote mudou enquanto era gerado.', 'state_conflict');
      return { ok: true, package: ready };
    } catch (error) {
      try { await stopHeartbeat(); } catch {}
      await persistFailure({ error, now: deps.now() });
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
        patch: { approved_at: deps.now().toISOString(), approved_by: user.id }
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

export async function reserveDailyContentPackage({ supabase, brandId, contentDate, seed, existingPackage, claimToken, now }) {
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS).toISOString();
  const claimFields = {
    claim_token: claimToken,
    claim_heartbeat_at: startedAt,
    claim_expires_at: expiresAt,
    generation_started_at: startedAt,
    updated_at: startedAt
  };
  const { data: inserted, error: insertError } = await supabase
    .from('daily_content_packages')
    .insert({ ...seed, ...claimFields })
    .select(PACKAGE_COLUMNS)
    .maybeSingle();
  if (!insertError && inserted) return { claimed: true, package: inserted };
  if (insertError?.code !== '23505') throwQueryError(insertError);

  const existing = existingPackage || await getDailyContentPackage({ supabase, brandId, contentDate });
  if (!existing || REUSABLE_STATUSES.has(existing.status)) return { claimed: false, package: existing };
  const staleDraft = existing.status === 'draft' && !claimIsLive(existing, now);
  if (existing.status !== 'failed' && !staleDraft) return { claimed: false, package: existing };

  const claimPayload = staleDraft
    ? claimFields
    : {
      ...seed,
      ...claimFields,
      status: 'draft',
      failure_code: null,
      failure_message: null,
      cleanup_error: null
    };
  let claim = supabase
    .from('daily_content_packages')
    .update(claimPayload)
    .eq('id', existing.id)
    .eq('status', existing.status);
  if (staleDraft) {
    claim = existing.claim_token
      ? claim.eq('claim_token', existing.claim_token)
      : claim.is('claim_token', null);
    claim = claim.or(`claim_expires_at.is.null,claim_expires_at.lte.${startedAt}`);
  }
  const { data: reserved, error } = await claim.select(PACKAGE_COLUMNS).maybeSingle();
  throwQueryError(error);
  return { claimed: Boolean(reserved), package: reserved || await getDailyContentPackage({ supabase, brandId, contentDate }) };
}

export async function markDailyContentReady({
  supabase, packageId, claimToken, generatedContent, mediaUrls, altText, sources, evidence, now
}) {
  const query = supabase
    .from('daily_content_packages')
    .update({
      status: 'ready',
      generated_content: generatedContent || {},
      media_urls: mediaUrls || [],
      alt_text: altText,
      sources: sources || [],
      evidence: evidence || {},
      generation_started_at: null,
      claim_token: null,
      claim_heartbeat_at: null,
      claim_expires_at: null,
      failure_code: null,
      failure_message: null,
      updated_at: now.toISOString()
    })
    .eq('id', packageId)
    .eq('status', 'draft')
    .eq('claim_token', claimToken);
  const { data, error } = await query.select(PACKAGE_COLUMNS).maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function markDailyContentFailed({
  supabase, packageId, claimToken, code, message, cleanupPendingPaths = [], cleanupError = null, now
}) {
  const query = supabase
    .from('daily_content_packages')
    .update({
      status: 'failed',
      generation_started_at: null,
      claim_token: null,
      claim_heartbeat_at: null,
      claim_expires_at: null,
      cleanup_pending_paths: cleanupPaths(cleanupPendingPaths),
      cleanup_error: cleanupError,
      failure_code: String(code || 'generation_failed').slice(0, 80),
      failure_message: String(message || 'Não foi possível preparar o conteúdo.').slice(0, 500),
      updated_at: now.toISOString()
    })
    .eq('id', packageId)
    .eq('status', 'draft')
    .eq('claim_token', claimToken);
  const { data, error } = await query.select(PACKAGE_COLUMNS).maybeSingle();
  throwQueryError(error);
  return data || null;
}

export async function heartbeatDailyContentClaim({ supabase, packageId, claimToken, now }) {
  const heartbeatAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from('daily_content_packages')
    .update({ claim_heartbeat_at: heartbeatAt, claim_expires_at: expiresAt, updated_at: heartbeatAt })
    .eq('id', packageId)
    .eq('status', 'draft')
    .eq('claim_token', claimToken)
    .select('id')
    .maybeSingle();
  throwQueryError(error);
  return Boolean(data);
}

export async function clearDailyContentCleanup({ supabase, packageId, paths, now }) {
  const { data, error } = await supabase
    .from('daily_content_packages')
    .update({ cleanup_pending_paths: [], cleanup_error: null, updated_at: now.toISOString() })
    .eq('id', packageId)
    .eq('status', 'failed')
    .contains('cleanup_pending_paths', cleanupPaths(paths))
    .select('id')
    .maybeSingle();
  throwQueryError(error);
  return Boolean(data);
}

export async function getDailyContentCleanupJobs({ supabase, brandId }) {
  const { data, error } = await supabase
    .from('daily_content_cleanup_jobs')
    .select('storage_path, last_error, created_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true });
  throwQueryError(error);
  return data || [];
}

export async function recordDailyContentCleanupFailure({ supabase, brandId, paths, error: cleanupError, now }) {
  const uniquePaths = cleanupPaths(paths);
  if (!uniquePaths.length) return true;
  if (!uniquePaths.every((path) => isPersistableDailyCleanupPath(path, brandId))) {
    throw new Error('Invalid daily cleanup path.');
  }
  const rows = uniquePaths.map((storagePath) => ({
    brand_id: brandId,
    storage_path: storagePath,
    last_error: String(cleanupError || 'Não foi possível remover as mídias geradas.').slice(0, 500),
    updated_at: now.toISOString()
  }));
  const { data, error } = await supabase
    .from('daily_content_cleanup_jobs')
    .upsert(rows, { onConflict: 'brand_id,storage_path' })
    .select('id');
  throwQueryError(error);
  return Array.isArray(data) && data.length === rows.length;
}

export async function clearDailyContentCleanupJobs({ supabase, brandId, paths }) {
  const uniquePaths = cleanupPaths(paths);
  if (!uniquePaths.length) return true;
  if (!uniquePaths.every((path) => isPersistableDailyCleanupPath(path, brandId))) {
    throw new Error('Invalid daily cleanup path.');
  }
  const { data, error } = await supabase
    .from('daily_content_cleanup_jobs')
    .delete()
    .eq('brand_id', brandId)
    .in('storage_path', uniquePaths)
    .select('storage_path');
  throwQueryError(error);
  return Array.isArray(data) && data.length === uniquePaths.length;
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
