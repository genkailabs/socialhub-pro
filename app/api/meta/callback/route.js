import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, exchangeForLongLivedToken, discoverInstagramAccount } from '@/lib/meta/graph';

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
    const { igAccount, page } = await discoverInstagramAccount(longToken);

    const { error: upErr } = await supabase.from('social_tokens').upsert({
      user_id: user.id,
      brand_id: brandId,
      platform: 'instagram',
      access_token: longToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      platform_user_id: igAccount.id,
      platform_username: igAccount.username || igAccount.name,
      platform_data: { page_id: page.id, page_name: page.name, profile_picture_url: igAccount.profile_picture_url || null },
      is_active: true,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'brand_id,platform' });
    if (upErr) throw new Error(`Erro ao salvar token: ${upErr.message}`);

    const uname = igAccount.username || igAccount.name;
    return NextResponse.redirect(`${appUrl}/connections?status=success&platform=instagram&username=${encodeURIComponent(uname)}`);
  } catch (e) {
    return back(e.message || 'Erro interno ao processar autorização.');
  }
}
