import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { publishInstagramImage, publishInstagramCarousel } from '@/lib/meta/graph';
import { runDailyAutopilot } from '@/lib/autopilot';

export const maxDuration = 60;

export async function GET(request) {
  // Autenticação do cron (Vercel envia Authorization: Bearer $CRON_SECRET)
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const admin = createAdmin();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from('posts')
    .select('id, brand_id, content, media_url, media_urls')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const post of due || []) {
    const { data: token } = await admin
      .from('social_tokens')
      .select('access_token, platform_user_id')
      .eq('brand_id', post.brand_id).eq('platform', 'instagram').eq('is_active', true)
      .maybeSingle();

    if (!token) {
      await admin.from('posts').update({ status: 'error' }).eq('id', post.id);
      results.push({ id: post.id, status: 'error', reason: 'sem token' });
      continue;
    }
    try {
      const urls = (post.media_urls && post.media_urls.length) ? post.media_urls : (post.media_url ? [post.media_url] : []);
      const igId = urls.length > 1
        ? await publishInstagramCarousel({ igId: token.platform_user_id, token: token.access_token, caption: post.content || '', imageUrls: urls })
        : await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: post.content || '', imageUrl: urls[0] });
      await admin.from('posts').update({ status: 'published' }).eq('id', post.id);
      results.push({ id: post.id, status: 'published', igId });
    } catch (e) {
      await admin.from('posts').update({ status: 'error' }).eq('id', post.id);
      results.push({ id: post.id, status: 'error', reason: e.message });
    }
  }

  // Piloto automático: gera os criativos do dia (rascunhos p/ aprovação).
  // Só roda se a chave da IA estiver configurada; falha aqui não quebra a publicação.
  let autopilot = [];
  if (process.env.DEEPSEEK_API_KEY) {
    try { autopilot = await runDailyAutopilot(admin); }
    catch (e) { autopilot = [{ error: e.message }]; }
  }

  return NextResponse.json({ ok: true, processed: results.length, results, autopilot });
}
