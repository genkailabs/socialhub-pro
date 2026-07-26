import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, exchangeForLongLivedToken } from '@/lib/meta/graph';
import { listAdAccounts } from '@/lib/meta/marketing-api';
import { safeReturnTo } from '@/lib/oauth-return';

function message(error) {
  return String(error?.message || 'Falha ao conectar a conta de anúncios.').replace(/access_token=[^&\s]+/gi, 'access_token=[removido]');
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = process.env.APP_URL || origin;
  const back = (text) => NextResponse.redirect(`${appUrl}/paid-traffic?error=${encodeURIComponent(text)}`);
  const denied = searchParams.get('error_description') || searchParams.get('error');
  const code = searchParams.get('code');
  if (denied) return back(`Autorização cancelada: ${denied}`);
  if (!code) return back('Código de autorização não recebido da Meta.');
  let state = null;
  try { state = JSON.parse(Buffer.from(searchParams.get('state') || '', 'base64').toString('utf8')); } catch { /* checked below */ }
  const brandId = state?.brand_id;
  const returnTo = safeReturnTo(state?.rt) || '/paid-traffic';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !brandId || user.id !== state?.uid) return back('Sessão inválida. Faça login e tente novamente.');
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return back('Marca inválida ou sem permissão.');
  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return back('Integração Meta não configurada no servidor.');
    const redirectUri = `${appUrl}/api/meta/ads/callback`;
    const shortToken = await exchangeCodeForToken({ code, appId, appSecret, redirectUri });
    const { token, expiresIn } = await exchangeForLongLivedToken({ shortToken, appId, appSecret });
    const accounts = await listAdAccounts(token);
    if (accounts.length === 0) return back('A Meta não devolveu nenhuma conta de anúncios autorizada. Confira ads_read e a conta autorizada no painel Meta.');
    if (accounts.length > 1) return back('Há mais de uma conta disponível. A seleção de múltiplas contas será liberada antes de continuar.');
    const account = accounts[0];
    const now = new Date().toISOString();
    const { error: tokenError } = await supabase.from('social_tokens').upsert({
      user_id: user.id,
      brand_id: brandId,
      platform: 'meta_ads',
      access_token: token,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      platform_user_id: account.id,
      platform_username: account.name,
      platform_data: { purpose: 'ads_read' },
      is_active: true,
      last_synced_at: now
    }, { onConflict: 'brand_id,platform' });
    if (tokenError) throw new Error('Não foi possível salvar a autorização de anúncios.');
    const { error: accountError } = await supabase.from('meta_ad_accounts').upsert({
      brand_id: brandId,
      meta_account_id: account.id,
      name: account.name,
      currency: account.currency || 'BRL',
      account_status: String(account.account_status || ''),
      is_active: true,
      last_synced_at: now
    }, { onConflict: 'brand_id,meta_account_id' });
    if (accountError) throw new Error('Não foi possível salvar a conta de anúncios.');
    revalidatePath('/paid-traffic');
    return NextResponse.redirect(`${appUrl}${returnTo}?status=connected`);
  } catch (error) {
    return back(message(error));
  }
}
