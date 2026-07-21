import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, exchangeForLongLivedToken, discoverPages } from '@/lib/meta/graph';
import { getBrandInstagramMetrics } from '@/lib/metrics-data';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = process.env.APP_URL || origin;
  const code = searchParams.get('code');
  const error = searchParams.get('error_description') || searchParams.get('error');
  const back = (msg) => NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent(msg)}`);

  if (error) return back(`Falha na autorização: ${error}`);
  if (!code) return back('Código de autorização não recebido da Meta.');

  // Decodifica state → brand_id + uid
  let brandId = null, uid = null;
  try {
    const s = JSON.parse(Buffer.from(searchParams.get('state') || '', 'base64').toString('utf8'));
    brandId = s.brand_id; uid = s.uid;
  } catch { /* state inválido tratado abaixo */ }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !brandId || user.id !== uid) return back('Sessão inválida. Faça login e tente conectar novamente.');

  // Confirma posse da marca (RLS)
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return back('Marca inválida ou sem permissão.');

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return back('Integração Meta não configurada no servidor.');
    const redirectUri = `${appUrl}/api/meta/callback`;

    const shortToken = await exchangeCodeForToken({ code, appId, appSecret, redirectUri });
    const { token: longToken, expiresIn } = await exchangeForLongLivedToken({ shortToken, appId, appSecret });
    const { page } = await discoverPages(longToken);

    const now = new Date().toISOString();
    // Page access tokens derivados de um user token long-lived não expiram.
    const rows = [{
      user_id: user.id,
      brand_id: brandId,
      platform: 'facebook',
      access_token: page.access_token,
      token_expires_at: null,
      platform_user_id: page.id,
      platform_username: page.name,
      platform_data: { page_id: page.id, page_name: page.name },
      is_active: true,
      last_synced_at: now
    }];

    // Se a Página tiver IG Business vinculado, conecta o Instagram no mesmo fluxo.
    const igAccount = page.instagram_business_account;
    if (igAccount) {
      rows.push({
        user_id: user.id,
        brand_id: brandId,
        platform: 'instagram',
        access_token: longToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        platform_user_id: igAccount.id,
        platform_username: igAccount.username || igAccount.name,
        platform_data: { page_id: page.id, page_name: page.name, profile_picture_url: igAccount.profile_picture_url || null },
        is_active: true,
        last_synced_at: now
      });
    }

    const { error: upErr } = await supabase.from('social_tokens').upsert(rows, { onConflict: 'brand_id,platform' });
    if (upErr) throw new Error(`Erro ao salvar token: ${upErr.message}`);

    const connected = igAccount ? 'instagram' : 'facebook';
    const uname = igAccount ? (igAccount.username || igAccount.name) : page.name;

    // Primeira sincronização logo após conectar, como o callback do YouTube já
    // faz: sem ela o painel fica vazio até a próxima visita e parece quebrado.
    // Falha aqui não desfaz a conexão — o token está salvo e válido.
    let sync = 'skipped';
    if (igAccount) {
      const result = await getBrandInstagramMetrics(brandId);
      sync = result?.ok ? 'success' : 'warning';
    }

    return NextResponse.redirect(`${appUrl}/connections?status=success&platform=${connected}&username=${encodeURIComponent(uname)}&sync=${sync}`);
  } catch (e) {
    return back(e.message || 'Erro interno ao processar autorização.');
  }
}
