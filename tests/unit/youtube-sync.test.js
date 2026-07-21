import { beforeEach, describe, expect, it, vi } from 'vitest';

const googleMocks = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
  getChannel: vi.fn(),
  getChannelStats: vi.fn(),
  listChannelVideos: vi.fn(),
  getVideosStats: vi.fn()
}));

vi.mock('@/lib/youtube/google', () => googleMocks);

import { syncYoutubeBrandMetrics } from '@/lib/youtube/sync';

describe('syncYoutubeBrandMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists channel and video stats plus a success log', async () => {
    googleMocks.getChannel.mockResolvedValue({
      id: 'channel-1',
      title: 'Genkai Labs',
      handle: '@genkailabs',
      thumbnail: 'https://example.com/thumb.jpg'
    });
    googleMocks.getChannelStats.mockResolvedValue({ views: 456, watchTimeMin: 999, subscribersGained: 3 });
    googleMocks.listChannelVideos.mockResolvedValue([
      { videoId: 'vid-1', title: 'Video 1', publishedAt: '2026-07-01T00:00:00Z' },
      { videoId: 'vid-2', title: 'Video 2', publishedAt: '2026-07-05T00:00:00Z' }
    ]);
    googleMocks.getVideosStats.mockResolvedValue([
      { videoId: 'vid-1', views: 100, likes: 11, comments: 2, avgViewPct: 42.5, watchTimeMin: 50 }
    ]);

    const tableOps = {};
    const admin = {
      from: vi.fn((table) => {
        if (!tableOps[table]) {
          tableOps[table] = {
            upsert: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return tableOps[table];
      })
    };

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        items: [{ statistics: { subscriberCount: '321' } }]
      })
    });

    const result = await syncYoutubeBrandMetrics({
      admin,
      brandId: 'brand-1',
      accessToken: 'access-token',
      today: '2026-07-15'
    });

    expect(googleMocks.refreshAccessToken).not.toHaveBeenCalled();
    expect(googleMocks.getChannel).toHaveBeenCalledWith('access-token');
    expect(googleMocks.getChannelStats).toHaveBeenCalledWith('access-token', '2026-07-15');
    expect(googleMocks.listChannelVideos).toHaveBeenCalledWith('access-token', 25);
    expect(googleMocks.getVideosStats).toHaveBeenCalledWith('access-token', ['vid-1', 'vid-2'], '2026-07-01', '2026-07-15');

    expect(tableOps['social_analytics_history'].upsert).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 'brand-1',
      platform: 'youtube',
      snapshot_date: '2026-07-15',
      followers: 321,
      total_reach: 456
    }), { onConflict: 'brand_id,platform,snapshot_date' });

    expect(tableOps['youtube_video_stats'].upsert).toHaveBeenCalledTimes(2);
    expect(tableOps['youtube_video_stats'].upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      brand_id: 'brand-1',
      video_id: 'vid-1',
      snapshot_date: '2026-07-15',
      views: 100,
      likes: 11,
      comments: 2,
      avg_view_pct: 42.5,
      watch_time_min: 50
    }), { onConflict: 'brand_id,video_id,snapshot_date' });
    expect(tableOps['youtube_video_stats'].upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      brand_id: 'brand-1',
      video_id: 'vid-2',
      snapshot_date: '2026-07-15',
      views: 0,
      likes: 0,
      comments: 0,
      avg_view_pct: 0,
      watch_time_min: 0
    }), { onConflict: 'brand_id,video_id,snapshot_date' });

    expect(tableOps['social_sync_logs'].insert).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: 'brand-1',
      platform: 'youtube',
      status: 'success'
    }));
    expect(result.channel.title).toBe('Genkai Labs');
    expect(result.videos).toHaveLength(2);
  });
});
