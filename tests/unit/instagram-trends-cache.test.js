import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createAdmin: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdmin: mocks.createAdmin }));

describe('cliente de cache da pesquisa de tendências', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('desabilita o cache sem URL e service role, sem cair no client RLS do usuário', async () => {
    const { createTrendsResearchCacheClient } = await import('@/lib/instagram-trends-cache');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    expect(createTrendsResearchCacheClient()).toBeNull();
    expect(mocks.createAdmin).not.toHaveBeenCalled();
  });

  it('usa o client administrativo somente quando as duas credenciais do servidor existem', async () => {
    const { createTrendsResearchCacheClient } = await import('@/lib/instagram-trends-cache');
    const admin = { from: vi.fn() };
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-secret');
    mocks.createAdmin.mockReturnValue(admin);

    expect(createTrendsResearchCacheClient()).toBe(admin);
    expect(mocks.createAdmin).toHaveBeenCalledOnce();
  });
});
