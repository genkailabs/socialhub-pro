import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDailyContentService,
  markDailyContentReady,
  recordDailyContentCleanupFailure
} from '@/lib/daily-content-data';

const NOW = new Date('2026-07-26T12:00:00.000Z');
const USER = { id: 'user-1' };
const BRAND = { id: 'brand-1', name: 'Marca', color: '#123456' };
const OPPORTUNITY = {
  topic: 'Tema seguro',
  objective: 'educar',
  format: 'Post',
  reason: 'approved-calendar',
  recommendedAt: { weekday: 1, time: '12:00', source: 'measured' }
};
const DRAFT = {
  id: 'package-1', brand_id: BRAND.id, content_date: '2026-07-26', status: 'draft',
  topic: OPPORTUNITY.topic, goal: OPPORTUNITY.objective, format: OPPORTUNITY.format,
  claim_token: 'claim-1',
  claim_heartbeat_at: '2026-07-26T12:00:00.000Z',
  claim_expires_at: '2026-07-26T12:05:00.000Z',
  cleanup_pending_paths: []
};
const READY = {
  ...DRAFT,
  status: 'ready',
  generated_content: { caption: 'Legenda pronta' },
  media_urls: [],
  sources: []
};

function dependencies(overrides = {}) {
  return {
    authenticate: vi.fn().mockResolvedValue(USER),
    getOwnedBrand: vi.fn().mockResolvedValue(BRAND),
    getPackageForDate: vi.fn().mockResolvedValue(null),
    reservePackage: vi.fn().mockResolvedValue({ claimed: true, package: DRAFT }),
    markReady: vi.fn().mockImplementation(async ({ generatedContent, mediaUrls, sources }) => ({
      ...READY,
      generated_content: generatedContent,
      media_urls: mediaUrls,
      sources
    })),
    markFailed: vi.fn().mockResolvedValue({ ...DRAFT, status: 'failed', failure_code: 'research_unavailable' }),
    getPackageById: vi.fn().mockResolvedValue(READY),
    transitionPackage: vi.fn().mockImplementation(async ({ fromStatus, toStatus, patch = {} }) => ({
      ...READY,
      status: toStatus,
      ...patch
    })),
    loadContext: vi.fn().mockResolvedValue({}),
    selectOpportunity: vi.fn().mockReturnValue(OPPORTUNITY),
    requiresResearch: vi.fn().mockReturnValue(false),
    researchOpportunity: vi.fn(),
    generateContent: vi.fn().mockResolvedValue({
      generatedContent: { caption: 'Legenda pronta' },
      mediaUrls: [],
      mediaPaths: [],
      altText: 'Arte da marca'
    }),
    createClaimToken: vi.fn(() => 'claim-1'),
    startHeartbeat: vi.fn().mockResolvedValue({ stop: vi.fn().mockResolvedValue(true) }),
    cleanupMedia: vi.fn().mockResolvedValue({ ok: true }),
    getCleanupJobs: vi.fn().mockResolvedValue([]),
    clearCleanupJobs: vi.fn().mockResolvedValue(true),
    clearCleanupFailure: vi.fn().mockResolvedValue(true),
    recordCleanupFailure: vi.fn().mockResolvedValue(true),
    now: vi.fn(() => new Date(NOW)),
    ...overrides
  };
}

describe('daily content service access boundaries', () => {
  it('rejects an unauthenticated request before reading a brand or generating content', async () => {
    const deps = dependencies({ authenticate: vi.fn().mockResolvedValue(null) });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id })).resolves.toEqual({
      error: 'Sessão expirada.',
      code: 'auth_required'
    });

    expect(deps.getOwnedBrand).not.toHaveBeenCalled();
    expect(deps.generateContent).not.toHaveBeenCalled();
  });

  it('rejects a brand hidden by RLS and never starts generation', async () => {
    const deps = dependencies({ getOwnedBrand: vi.fn().mockResolvedValue(null) });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: 'other-brand' })).resolves.toEqual({
      error: 'Marca não encontrada.',
      code: 'brand_not_found'
    });

    expect(deps.getOwnedBrand).toHaveBeenCalledWith({ brandId: 'other-brand', user: USER });
    expect(deps.reservePackage).not.toHaveBeenCalled();
    expect(deps.generateContent).not.toHaveBeenCalled();
  });
});

describe('prepareDailyContent orchestration', () => {
  it('reuses the unique ready package for the same UTC day without generation', async () => {
    const deps = dependencies({ getPackageForDate: vi.fn().mockResolvedValue(READY) });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id, contentDate: '2026-07-26' }))
      .resolves.toEqual({ ok: true, package: READY });

    expect(deps.getPackageForDate).toHaveBeenCalledWith({ brandId: BRAND.id, contentDate: '2026-07-26' });
    expect(deps.reservePackage).not.toHaveBeenCalled();
    expect(deps.generateContent).not.toHaveBeenCalled();
  });

  it('never reclaims an existing draft or starts duplicate generation', async () => {
    const activeDraft = { ...DRAFT, generation_started_at: '2026-07-26T11:00:00.000Z' };
    const deps = dependencies({ getPackageForDate: vi.fn().mockResolvedValue(activeDraft) });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id, contentDate: '2026-07-26' })).resolves.toEqual({
      error: 'A geração deste pacote já está em andamento.',
      code: 'generation_in_progress'
    });

    expect(deps.loadContext).not.toHaveBeenCalled();
    expect(deps.reservePackage).not.toHaveBeenCalled();
    expect(deps.generateContent).not.toHaveBeenCalled();
  });

  it('recovers an expired draft with a new durable claim', async () => {
    const staleDraft = {
      ...DRAFT,
      claim_token: 'abandoned-claim',
      claim_expires_at: '2026-07-26T11:59:59.000Z'
    };
    const reclaimed = {
      ...DRAFT,
      claim_token: 'claim-2',
      claim_heartbeat_at: NOW.toISOString(),
      claim_expires_at: '2026-07-26T12:05:00.000Z'
    };
    const deps = dependencies({
      getPackageForDate: vi.fn().mockResolvedValue(staleDraft),
      createClaimToken: vi.fn(() => 'claim-2'),
      reservePackage: vi.fn().mockResolvedValue({ claimed: true, package: reclaimed })
    });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id, contentDate: '2026-07-26' }))
      .resolves.toEqual({ ok: true, package: expect.objectContaining({ status: 'ready' }) });

    expect(deps.reservePackage).toHaveBeenCalledWith(expect.objectContaining({
      existingPackage: staleDraft,
      claimToken: 'claim-2'
    }));
    expect(deps.markReady).toHaveBeenCalledWith(expect.objectContaining({ claimToken: 'claim-2' }));
  });

  it('retries durable orphan cleanup before regenerating a failed package', async () => {
    const failed = {
      ...DRAFT,
      status: 'failed',
      claim_token: null,
      claim_expires_at: null,
      cleanup_pending_paths: ['brand-1/daily/old-claim/ai-1721995200000-0.png'],
      cleanup_error: 'Falha anterior de storage.'
    };
    const deps = dependencies({ getPackageForDate: vi.fn().mockResolvedValue(failed) });
    const service = createDailyContentService(deps);

    await service.prepare({ brandId: BRAND.id, contentDate: '2026-07-26' });

    expect(deps.cleanupMedia).toHaveBeenCalledWith({ paths: failed.cleanup_pending_paths });
    expect(deps.clearCleanupFailure).toHaveBeenCalledWith({ packageId: failed.id, paths: failed.cleanup_pending_paths });
    expect(deps.cleanupMedia.mock.invocationCallOrder[0]).toBeLessThan(deps.reservePackage.mock.invocationCallOrder[0]);
  });

  it('never sends a generic AI asset through daily orphan cleanup', async () => {
    const genericPath = 'brand-1/ai-1721995200000-0.png';
    const failed = {
      ...DRAFT,
      status: 'failed',
      claim_token: null,
      claim_expires_at: null,
      cleanup_pending_paths: [genericPath],
      cleanup_error: 'Falha anterior de storage.'
    };
    const deps = dependencies({ getPackageForDate: vi.fn().mockResolvedValue(failed) });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id, contentDate: '2026-07-26' }))
      .resolves.toMatchObject({ code: 'cleanup_pending' });

    expect(deps.cleanupMedia).not.toHaveBeenCalled();
    expect(deps.reservePackage).not.toHaveBeenCalled();
  });

  it('assigns the claimed daily namespace to generation', async () => {
    const deps = dependencies();
    const service = createDailyContentService(deps);

    await service.prepare({ brandId: BRAND.id, contentDate: '2026-07-26' });

    expect(deps.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      mediaNamespace: `daily/${DRAFT.claim_token}`
    }));
  });

  it('records a failed outcome and does not generate factual news without verified research', async () => {
    const news = { ...OPPORTUNITY, topic: 'Notícias de hoje', format: 'news' };
    const deps = dependencies({
      selectOpportunity: vi.fn().mockReturnValue(news),
      requiresResearch: vi.fn().mockReturnValue(true),
      researchOpportunity: vi.fn().mockResolvedValue({ status: 'unavailable', reason: 'missing-sources', research: null })
    });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id })).resolves.toEqual({
      error: 'Não foi possível verificar as fontes atuais.',
      code: 'research_unavailable'
    });

    expect(deps.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      packageId: DRAFT.id,
      code: 'research_unavailable'
    }));
    expect(deps.generateContent).not.toHaveBeenCalled();
  });

  it('passes only status verified research to generation and never invokes publication', async () => {
    const publishApi = vi.fn();
    const verified = {
      status: 'verified',
      research: { summary: 'Fatos verificados.', sources: [{ url: 'https://example.com/report' }], images: [] }
    };
    const deps = dependencies({
      requiresResearch: vi.fn().mockReturnValue(true),
      researchOpportunity: vi.fn().mockResolvedValue(verified),
      publishApi
    });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id })).resolves.toEqual({
      ok: true,
      package: expect.objectContaining({ status: 'ready' })
    });

    expect(deps.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      verifiedResearch: verified.research
    }));
    expect(deps.markReady).toHaveBeenCalledWith(expect.objectContaining({
      sources: verified.research.sources
    }));
    expect(publishApi).not.toHaveBeenCalled();
  });

  it('persists orphan paths and safe cleanup details when ready persistence fails', async () => {
    const mediaPaths = ['brand-1/daily/claim-1/ai-1721995200000-0.png'];
    const deps = dependencies({
      generateContent: vi.fn().mockResolvedValue({
        generatedContent: { caption: 'Legenda pronta' },
        mediaUrls: ['https://cdn.example/generated-0.png'],
        mediaPaths,
        altText: 'Arte da marca'
      }),
      markReady: vi.fn().mockResolvedValue(null),
      cleanupMedia: vi.fn().mockRejectedValue(new Error('storage internal details'))
    });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id })).resolves.toEqual({
      error: 'O pacote mudou enquanto era gerado.',
      code: 'state_conflict',
      details: {
        cleanup: {
          pendingPaths: mediaPaths,
          error: 'Não foi possível remover as mídias geradas.'
        }
      }
    });

    expect(deps.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      claimToken: DRAFT.claim_token,
      cleanupPendingPaths: mediaPaths,
      cleanupError: 'Não foi possível remover as mídias geradas.'
    }));
    expect(deps.cleanupMedia).toHaveBeenCalledWith({ paths: mediaPaths });
  });

  it('persists an owner-scoped orphan job when claim loss races with deletion failure', async () => {
    const mediaPaths = ['brand-1/daily/claim-1/ai-1721995200000-0.png'];
    const deps = dependencies({
      generateContent: vi.fn().mockResolvedValue({
        generatedContent: { caption: 'Legenda antiga' },
        mediaUrls: ['https://cdn.example/generated-0.png'],
        mediaPaths,
        altText: 'Arte antiga'
      }),
      startHeartbeat: vi.fn().mockResolvedValue({ stop: vi.fn().mockResolvedValue(false) }),
      cleanupMedia: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      markFailed: vi.fn().mockResolvedValue(null)
    });
    const service = createDailyContentService(deps);

    await expect(service.prepare({ brandId: BRAND.id })).resolves.toMatchObject({
      code: 'state_conflict',
      details: { cleanup: { pendingPaths: mediaPaths } }
    });

    expect(deps.recordCleanupFailure).toHaveBeenCalledWith({
      brandId: BRAND.id,
      paths: mediaPaths,
      error: 'Não foi possível remover as mídias geradas.'
    });
    expect(deps.markFailed).toHaveBeenCalledWith(expect.objectContaining({
      packageId: DRAFT.id,
      claimToken: DRAFT.claim_token
    }));
  });

  it('retries owner-scoped orphan jobs before a future daily generation', async () => {
    const paths = ['brand-1/daily/old-claim/ai-1721995200000-0.png'];
    const deps = dependencies({
      getCleanupJobs: vi.fn().mockResolvedValue(paths.map((storage_path) => ({ storage_path })))
    });
    const service = createDailyContentService(deps);

    await service.prepare({ brandId: BRAND.id, contentDate: '2026-07-27' });

    expect(deps.cleanupMedia).toHaveBeenCalledWith({ paths });
    expect(deps.clearCleanupJobs).toHaveBeenCalledWith({ brandId: BRAND.id, paths });
    expect(deps.cleanupMedia.mock.invocationCallOrder[0])
      .toBeLessThan(deps.reservePackage.mock.invocationCallOrder[0]);
  });
});

describe('durable daily package claim ownership', () => {
  it('prevents an original worker from completing after its stale claim was replaced', async () => {
    const state = {
      ...DRAFT,
      claim_token: 'replacement-claim',
      claim_expires_at: '2026-07-26T12:05:00.000Z'
    };
    let payload;
    const conditions = [];
    const builder = {
      eq: vi.fn((column, value) => {
        conditions.push([column, value]);
        return builder;
      }),
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockImplementation(async () => {
          const matches = conditions.every(([column, value]) => state[column] === value);
          if (!matches) return { data: null, error: null };
          Object.assign(state, payload);
          return { data: { ...state }, error: null };
        })
      }))
    };
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn((next) => {
          payload = next;
          return builder;
        })
      }))
    };

    const result = await markDailyContentReady({
      supabase,
      packageId: state.id,
      claimToken: 'original-claim',
      generatedContent: { caption: 'Conteúdo antigo' },
      mediaUrls: ['https://cdn.example/old.png'],
      mediaPaths: ['brand-1/old.png'],
      altText: 'Arte antiga',
      sources: [],
      evidence: { kind: 'internal', source: 'approved-calendar' },
      now: NOW
    });

    expect(result).toBeNull();
    expect(state.status).toBe('draft');
    expect(state.claim_token).toBe('replacement-claim');
    expect(builder.eq).toHaveBeenCalledWith('claim_token', 'original-claim');
  });

  it('deduplicates safe daily orphan paths without package status or claim filters', async () => {
    const brandId = '11111111-1111-4111-8111-111111111111';
    const path = `${brandId}/daily/22222222-2222-4222-8222-222222222222/ai-1721995200000-0.png`;
    const select = vi.fn().mockResolvedValue({ data: [{ id: 'job-1' }], error: null });
    const upsert = vi.fn(() => ({ select }));
    const supabase = { from: vi.fn(() => ({ upsert })) };

    await expect(recordDailyContentCleanupFailure({
      supabase,
      brandId,
      paths: [path, path],
      error: 'storage unavailable',
      now: NOW
    })).resolves.toBe(true);

    expect(supabase.from).toHaveBeenCalledWith('daily_content_cleanup_jobs');
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({ brand_id: brandId, storage_path: path })
    ], { onConflict: 'brand_id,storage_path' });
  });

  it('rejects generic or cross-brand paths before creating an orphan job', async () => {
    const brandId = '11111111-1111-4111-8111-111111111111';
    const supabase = { from: vi.fn() };

    await expect(recordDailyContentCleanupFailure({
      supabase,
      brandId,
      paths: [`${brandId}/ai-1721995200000-0.png`],
      error: 'storage unavailable',
      now: NOW
    })).rejects.toThrow(/daily cleanup path/i);

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('daily package state machine', () => {
  let deps;

  beforeEach(() => {
    deps = dependencies();
  });

  it('allows only ready -> approved', async () => {
    const service = createDailyContentService(deps);

    await expect(service.approve({ packageId: READY.id })).resolves.toEqual({
      ok: true,
      package: expect.objectContaining({ status: 'approved' })
    });
    expect(deps.transitionPackage).toHaveBeenCalledWith({
      packageId: READY.id,
      fromStatus: 'ready',
      toStatus: 'approved',
      patch: expect.objectContaining({ approved_at: NOW.toISOString() })
    });

    deps.getPackageById.mockResolvedValue({ ...DRAFT, status: 'draft' });
    deps.transitionPackage.mockClear();
    await expect(service.approve({ packageId: DRAFT.id })).resolves.toEqual({
      error: 'Estado inválido para aprovação.',
      code: 'invalid_state'
    });
    expect(deps.transitionPackage).not.toHaveBeenCalled();
  });

  it('rejects invalid or non-future schedule dates before updating state', async () => {
    const service = createDailyContentService(deps);
    deps.getPackageById.mockResolvedValue({ ...READY, status: 'approved' });

    await expect(service.schedule({ packageId: READY.id, scheduledAt: 'data-inválida' }))
      .resolves.toEqual({ error: 'Data de agendamento inválida.', code: 'invalid_schedule' });
    await expect(service.schedule({ packageId: READY.id, scheduledAt: '2026-07-26T11:59:59.000Z' }))
      .resolves.toEqual({ error: 'O agendamento deve estar no futuro.', code: 'schedule_not_future' });

    expect(deps.transitionPackage).not.toHaveBeenCalled();
  });

  it.each([
    '2026-07-27',
    '2026-07-27 15:00:00',
    '07/27/2026 15:00:00',
    '2027-02-30T15:00:00Z'
  ])('rejects a future value without a strict ISO-8601 timezone: %s', async (scheduledAt) => {
    const service = createDailyContentService(deps);
    deps.getPackageById.mockResolvedValue({ ...READY, status: 'approved' });

    await expect(service.schedule({ packageId: READY.id, scheduledAt }))
      .resolves.toEqual({ error: 'Data de agendamento inválida.', code: 'invalid_schedule' });
    expect(deps.transitionPackage).not.toHaveBeenCalled();
  });

  it('allows only approved -> scheduled and does not publish externally', async () => {
    const publishApi = vi.fn();
    deps = dependencies({
      getPackageById: vi.fn().mockResolvedValue({ ...READY, status: 'approved' }),
      publishApi
    });
    const service = createDailyContentService(deps);
    const scheduledAt = '2026-07-27T15:00:00.000Z';

    await expect(service.schedule({ packageId: READY.id, scheduledAt })).resolves.toEqual({
      ok: true,
      package: expect.objectContaining({ status: 'scheduled', scheduled_at: scheduledAt })
    });

    expect(deps.transitionPackage).toHaveBeenCalledWith({
      packageId: READY.id,
      fromStatus: 'approved',
      toStatus: 'scheduled',
      patch: { scheduled_at: scheduledAt }
    });
    expect(publishApi).not.toHaveBeenCalled();
  });
});

describe('daily content package migration', () => {
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260726000300_daily_content_packages.sql');
  const cleanupMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260726000400_daily_content_cleanup_jobs.sql');

  it('enforces one package per brand/day and owner-only RLS without public access or sensitive fields', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/unique\s*\(\s*brand_id\s*,\s*content_date\s*\)/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/brands\s+b[\s\S]*b\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/to authenticated/i);
    expect(sql).not.toMatch(/to\s+(anon|public)/i);
    expect(sql).not.toMatch(/\b(access_token|refresh_token|secret|raw_provider_response)\b/i);
  });

  it('repairs uniqueness drift with a named brand/date constraint', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/daily_content_packages_brand_date_key/i);
    expect(sql).toMatch(/pg_constraint/i);
    expect(sql).toMatch(/alter table\s+public\.daily_content_packages[\s\S]*add constraint[\s\S]*unique\s*\(\s*brand_id\s*,\s*content_date\s*\)/i);
  });

  it('installs a database trigger that permits only the legal state edges', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/create or replace function\s+public\.enforce_daily_content_package_transition/i);
    expect(sql).toMatch(/old\.status\s*=\s*'draft'[\s\S]*new\.status\s+in\s*\(\s*'ready'\s*,\s*'failed'\s*\)/i);
    expect(sql).toMatch(/old\.status\s*=\s*'failed'[\s\S]*new\.status\s*=\s*'draft'/i);
    expect(sql).toMatch(/old\.status\s*=\s*'ready'[\s\S]*new\.status\s*=\s*'approved'/i);
    expect(sql).toMatch(/old\.status\s*=\s*'approved'[\s\S]*new\.status\s*=\s*'scheduled'/i);
    expect(sql).toMatch(/create trigger\s+daily_content_packages_enforce_transition/i);
  });

  it('blocks semantically incomplete ready, approved, and scheduled rows in the trigger', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/add column if not exists evidence\s+jsonb/i);
    expect(sql).toMatch(/add column if not exists approved_by\s+uuid/i);
    expect(sql).toMatch(/new\.status\s+in\s*\(\s*'ready'\s*,\s*'approved'\s*,\s*'scheduled'\s*\)[\s\S]*generated_content[\s\S]*media_urls[\s\S]*alt_text[\s\S]*evidence/i);
    expect(sql).toMatch(/new\.status\s+in\s*\(\s*'approved'\s*,\s*'scheduled'\s*\)[\s\S]*approved_at[\s\S]*approved_by[\s\S]*auth\.uid\(\)/i);
    expect(sql).toMatch(/new\.status\s*=\s*'scheduled'[\s\S]*scheduled_at\s*<=\s*now\(\)/i);
    expect(sql).toMatch(/before insert or update on public\.daily_content_packages/i);
  });

  it('adds durable claim heartbeat and orphan cleanup state additively', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/add column if not exists claim_token\s+uuid/i);
    expect(sql).toMatch(/add column if not exists claim_heartbeat_at\s+timestamptz/i);
    expect(sql).toMatch(/add column if not exists claim_expires_at\s+timestamptz/i);
    expect(sql).toMatch(/add column if not exists cleanup_pending_paths\s+text\[\]/i);
    expect(sql).toMatch(/add column if not exists cleanup_error\s+text/i);
  });

  it('protects same-status rows and permits only draft claim or failed cleanup bookkeeping', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const start = sql.search(/if new\.status is not distinct from old\.status then/i);
    const end = sql.search(/if old\.status = 'draft' and new\.status in/i);
    const sameStatus = start >= 0 && end > start ? sql.slice(start, end) : '';

    expect(sameStatus).not.toMatch(/if new\.status is not distinct from old\.status then\s+return new\s*;/i);
    expect(sameStatus).toMatch(/old\.status\s*=\s*'draft'/i);
    expect(sameStatus).toMatch(/claim_token/i);
    expect(sameStatus).toMatch(/claim_heartbeat_at/i);
    expect(sameStatus).toMatch(/claim_expires_at/i);
    expect(sameStatus).toMatch(/old\.status\s*=\s*'failed'/i);
    expect(sameStatus).toMatch(/cleanup_pending_paths/i);
    expect(sameStatus).toMatch(/cleanup_error/i);
    expect(sameStatus).toMatch(/raise exception/i);
    expect(sameStatus).toMatch(/to_jsonb\s*\(\s*new\s*\)/i);
    expect(sameStatus).toMatch(/to_jsonb\s*\(\s*old\s*\)/i);
    expect(sameStatus).not.toMatch(/generated_content|media_urls|evidence|scheduled_at|approved_at|topic|goal|format|reason/i);
  });

  it('allows cleanup only inside the daily claim namespace of an owned brand', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const policy = sql.match(
      /create policy\s+"daily_content_package_ai_media_delete"[\s\S]*?;/i
    )?.[0];

    expect(policy).toBeDefined();
    expect(policy).toMatch(/on\s+storage\.objects\s+for\s+delete\s+to\s+authenticated/i);
    expect(policy).toMatch(/bucket_id\s*=\s*'media'/i);
    expect(policy).toMatch(/cardinality\s*\(\s*storage\.foldername\s*\(\s*name\s*\)\s*\)\s*=\s*3/i);
    expect(policy).toMatch(/\(\s*storage\.foldername\s*\(\s*name\s*\)\s*\)\[2\]\s*=\s*'daily'/i);
    expect(policy).toMatch(/\(\s*storage\.foldername\s*\(\s*name\s*\)\s*\)\[3\]\s*~/i);
    expect(policy).toContain("(storage.foldername(name))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'");
    expect(policy).toContain("storage.filename(name) ~ '^ai-[0-9]+-[0-9]+\\.(png|jpg)$'");
    expect(policy).toMatch(/from\s+public\.brands\s+b[\s\S]*b\.id::text\s*=\s*\(\s*storage\.foldername\s*\(\s*name\s*\)\s*\)\[1\][\s\S]*b\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(policy).not.toMatch(/for\s+(all|insert|update)/i);
    expect(policy).not.toMatch(/cardinality\s*\(\s*storage\.foldername\s*\(\s*name\s*\)\s*\)\s*=\s*1/i);
  });

  it('stores owner-scoped, deduplicated cleanup jobs restricted to daily generated assets', () => {
    const sql = readFileSync(cleanupMigrationPath, 'utf8');

    expect(sql).toMatch(/create table if not exists public\.daily_content_cleanup_jobs/i);
    expect(sql).toMatch(/unique\s*\(\s*brand_id\s*,\s*storage_path\s*\)/i);
    expect(sql).toMatch(/storage_path[\s\S]*brand_id::text[\s\S]*\/daily\//i);
    expect(sql).toMatch(/ai-\[0-9\]\+\-\[0-9\]\+/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/to authenticated/i);
    expect(sql).toMatch(/brands\s+b[\s\S]*b\.id\s*=\s*daily_content_cleanup_jobs\.brand_id[\s\S]*b\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).not.toMatch(/to\s+(anon|public)/i);
  });

  it('terminates both PL/pgSQL blocks with valid END statements', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql.match(/END;\s*\$\$;/gi)).toHaveLength(2);
  });
});
