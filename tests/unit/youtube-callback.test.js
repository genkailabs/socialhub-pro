import { beforeEach, describe, expect, it, vi } from 'vitest';

const callbackMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getChannel: vi.fn(),
  syncYoutubeBrandMetrics: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: callbackMocks.createClient
}));

vi.mock('@/lib/youtube/google', () => ({
  exchangeCodeForToken: callbackMocks.exchangeCodeForToken,
  getChannel: callbackMocks.getChannel
}));

vi.mock('@/lib/youtube/sync', () => ({
  syncYoutubeBrandMetrics: callbackMocks.syncYoutubeBrandMetrics
}));

import { GET } from '@/app/api/youtube/callback/route';

describe('youtube callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.APP_URL = 'https://app.example.com';
  });

  it('saves the token and triggers the first sync immediately', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({ data: { id: 'brand-1' } });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn((table) => {
      if (table === 'brands') return { select };
      if (table === 'social_tokens') return { upsert };
      throw new Error(`Unexpected table ${table}`);
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
      },
      from
    };

    callbackMocks.createClient.mockResolvedValue(supabase);
    callbackMocks.exchangeCodeForToken.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600
    });
    callbackMocks.getChannel.mockResolvedValue({
      id: 'channel-1',
      title: 'Genkai Labs',
      handle: '@genkailabs',
      thumbnail: null
    });
    callbackMocks.syncYoutubeBrandMetrics.mockResolvedValue({
      channel: { title: 'Genkai Labs' },
      videos: []
    });

    const state = Buffer.from(JSON.stringify({ brand_id: 'brand-1', uid: 'user-1' })).toString('base64');
    const request = new Request(`https://example.com/api/youtube/callback?code=abc&state=${encodeURIComponent(state)}`);
    const response = await GET(request);
    const location = response.headers.get('location');

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(callbackMocks.syncYoutubeBrandMetrics).toHaveBeenCalledTimes(1);
    expect(callbackMocks.syncYoutubeBrandMetrics).toHaveBeenCalledWith(expect.objectContaining({
      admin: supabase,
      brandId: 'brand-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    }));
    expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(callbackMocks.syncYoutubeBrandMetrics.mock.invocationCallOrder[0]);
    expect(location).toContain('status=success');
    expect(location).toContain('platform=youtube');
    expect(location).toContain('sync=success');
  });
});
