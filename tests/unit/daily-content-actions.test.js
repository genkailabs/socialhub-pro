import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDailyContentService } from '@/lib/daily-content-data';

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
  topic: OPPORTUNITY.topic, goal: OPPORTUNITY.objective, format: OPPORTUNITY.format
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
      altText: 'Arte da marca'
    }),
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
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260726000200_daily_content_packages.sql');

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

  it('terminates both PL/pgSQL blocks with valid END statements', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql.match(/END;\s*\$\$;/gi)).toHaveLength(2);
  });
});
