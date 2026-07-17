import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { publishInstagramImage, publishInstagramCarousel, publishFacebookPhoto } from '@/lib/meta/graph';
import { runDailyAutopilot } from '@/lib/autopilot';

export const maxDuration = 60;

export async function GET(request) {
  // Autenticação do cron (o worker do Railway envia Authorization: Bearer $CRON_SECRET)
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const admin = createAdmin();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from('posts')
    .select('id, brand_id, content, media_url, media_urls, networks')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const post of due || []) {
    const urls = (post.media_urls && post.media_urls.length) ? post.media_urls : (post.media_url ? [post.media_url] : []);
    // Redes de imagem que sabemos publicar automaticamente hoje.
    const networks = (post.networks && post.networks.length ? post.networks : ['instagram'])
      .filter((n) => n === 'instagram' || n === 'facebook');
    if (!networks.length) {
      await admin.from('posts').update({ status: 'error' }).eq('id', post.id);
      results.push({ id: post.id, status: 'error', reason: 'nenhuma rede publicável' });
      continue;
    }

    const posted = [];
    const failed = [];
    for (const platform of networks) {
      const { data: token } = await admin
        .from('social_tokens')
        .select('access_token, platform_user_id')
        .eq('brand_id', post.brand_id).eq('platform', platform).eq('is_active', true)
        .maybeSingle();
      if (!token) { failed.push({ platform, reason: 'sem token' }); continue; }
      try {
        let mediaId;
        if (platform === 'facebook') {
          mediaId = await publishFacebookPhoto({ pageId: token.platform_user_id, pageToken: token.access_token, message: post.content || '', imageUrl: urls[0] });
        } else {
          mediaId = urls.length > 1
            ? await publishInstagramCarousel({ igId: token.platform_user_id, token: token.access_token, caption: post.content || '', imageUrls: urls })
            : await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: post.content || '', imageUrl: urls[0] });
        }
        posted.push({ platform, mediaId });
      } catch (e) {
        failed.push({ platform, reason: e.message });
      }
    }

    // Publicado se ao menos uma rede deu certo (evita reprocessar num loop de cron).
    const status = posted.length ? 'published' : 'error';
    await admin.from('posts').update({ status }).eq('id', post.id);
    results.push({ id: post.id, status, posted, failed });
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
