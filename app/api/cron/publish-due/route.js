import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { publishPostTo, publishableNetworks, mediaUrlsOf } from '@/lib/publishers';
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

  // Ordem estavel (mais antigo primeiro) para a fila ser justa e o resultado
  // reproduzivel. A idempotencia vem do claim abaixo, nao daqui.
  const { data: due, error } = await admin
    .from('posts')
    .select('id, brand_id, content, media_url, media_urls, networks, format')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const post of due || []) {
    // Claim atomico: so quem virar scheduled->publishing processa o post. Dois
    // disparos de cron sobrepostos nao publicam a mesma linha duas vezes — o
    // perdedor ve zero linhas e segue. Postgres garante a atomicidade do UPDATE.
    const { data: claimed } = await admin
      .from('posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)
      .eq('status', 'scheduled')
      .select('id');
    if (!claimed || !claimed.length) {
      results.push({ id: post.id, status: 'skipped', reason: 'reivindicado por outra execução' });
      continue;
    }

    const urls = mediaUrlsOf(post);
    const networks = publishableNetworks(post);
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
      try {
        const mediaId = await publishPostTo({
          platform, token, caption: post.content || '', urls, format: post.format
        });
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
