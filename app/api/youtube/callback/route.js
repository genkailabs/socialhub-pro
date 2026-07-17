import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, getChannel } from '@/lib/youtube/google';
import { syncYoutubeBrandMetrics } from '@/lib/youtube/sync';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = process.env.APP_URL || origin;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const back = (msg) => NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent(msg)}`);

  if (error) return back(`Falha na autorização: ${error}`);
  if (!code) return back('Código de autorização não recebido do Google.');

  let brandId = null, uid = null;
  try {
    const s = JSON.parse(Buffer.from(searchParams.get('state') || '', 'base64').toString('utf8'));
    brandId = s.brand_id; uid = s.uid;
  } catch {
    // state inválido tratado abaixo
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !brandId || user.id !== uid) return back('Sessão inválida. Faça login e tente conectar novamente.');

  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return back('Marca inválida ou sem permissão.');

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return back('Integração YouTube não configurada no servidor.');
    const redirectUri = `${appUrl}/api/youtube/callback`;

    const tok = await exchangeCodeForToken({ code, clientId, clientSecret, redirectUri });
    if (!tok.refresh_token) {
      return back('O Google não retornou refresh_token. Remova o acesso do app em myaccount.google.com e reconecte.');
    }
    const channel = await getChannel(tok.access_token);

    const { error: upErr } = await supabase.from('social_tokens').upsert({
      user_id: user.id,
      brand_id: brandId,
      platform: 'youtube',
      access_token: tok.access_token,
      token_expires_at: new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString(),
      platform_user_id: channel.id,
      platform_username: channel.handle || channel.title,
      // refresh_token vive no JSONB: access_token expira em ~1h e é renovado a partir dele.
      platform_data: { refresh_token: tok.refresh_token, channel_title: channel.title, thumbnail: channel.thumbnail },
      is_active: true,
      last_synced_at: new Date().toISOString()
    }, { onConflict: 'brand_id,platform' });
    if (upErr) throw new Error(`Erro ao salvar token: ${upErr.message}`);

    const uname = channel.handle || channel.title;
    try {
      await syncYoutubeBrandMetrics({
        admin: supabase,
        brandId,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        clientId,
        clientSecret
      });
      return NextResponse.redirect(`${appUrl}/connections?status=success&platform=youtube&username=${encodeURIComponent(uname)}&sync=success`);
    } catch (syncError) {
      return NextResponse.redirect(`${appUrl}/connections?status=success&platform=youtube&username=${encodeURIComponent(uname)}&sync=warning&sync_error=${encodeURIComponent(syncError.message)}`);
    }
  } catch (e) {
    return back(e.message || 'Erro interno ao processar autorização.');
  }
}
