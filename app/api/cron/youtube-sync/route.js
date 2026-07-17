import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { syncYoutubeBrandMetrics } from '@/lib/youtube/sync';

export const maxDuration = 60;

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Integração YouTube não configurada.' }, { status: 500 });
  }

  const admin = createAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tokens, error } = await admin
    .from('social_tokens')
    .select('brand_id, platform_data')
    .eq('platform', 'youtube')
    .eq('is_active', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const tok of tokens || []) {
    const refreshToken = tok.platform_data?.refresh_token;
    try {
      if (!refreshToken) {
        throw new Error('sem refresh_token');
      }
      const result = await syncYoutubeBrandMetrics({
        admin,
        brandId: tok.brand_id,
        today,
        refreshToken,
        clientId,
        clientSecret
      });
      results.push({
        brand_id: tok.brand_id,
        status: 'success',
        channel: result.channel.title,
        videos: result.videos.length
      });
    } catch (e) {
      results.push({ brand_id: tok.brand_id, status: 'error', reason: e.message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
