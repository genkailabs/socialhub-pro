import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { exchangeCodeForToken, exchangeForLongLivedToken } from '@/lib/meta/graph';
import { listAdAccounts } from '@/lib/meta/marketing-api';
import { safeReturnTo } from '@/lib/oauth-return';
import { ADS_OAUTH_STATE_COOKIE, readAdsOAuthState } from '@/lib/meta/ads-oauth-state';
import { syncPaidTraffic } from '@/lib/paid-traffic/sync';

function message(error) {
  return String(error?.message || 'Falha ao conectar a conta de anuncios.').replace(/access_token=[^&\s]+/gi, 'access_token=[removido]');
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = process.env.APP_URL || origin;
  const clearState = (response) => {
    response.cookies.set(ADS_OAUTH_STATE_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
    return response;
  };
  const back = (text) => clearState(NextResponse.redirect(`${appUrl}/paid-traffic?error=${encodeURIComponent(text)}`));
  const denied = searchParams.get('error_description') || searchParams.get('error');
  const code = searchParams.get('code');
  if (denied) return back(`Autorizacao cancelada: ${denied}`);
  if (!code) return back('Codigo de autorizacao nao recebido da Meta.');

  const cookieStore = await cookies();
  const state = readAdsOAuthState({ state: searchParams.get('state'), cookieValue: cookieStore.get(ADS_OAUTH_STATE_COOKIE)?.value });
  const brandId = state?.brandId;
  const returnTo = safeReturnTo(state?.returnTo) || '/paid-traffic';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !brandId || user.id !== state?.userId) return back('Sessao invalida ou expirada. Faca login e tente novamente.');
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return back('Marca invalida ou sem permissao.');

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return back('Integracao Meta nao configurada no servidor.');
    const redirectUri = `${appUrl}/api/meta/ads/callback`;
    const shortToken = await exchangeCodeForToken({ code, appId, appSecret, redirectUri });
    const { token, expiresIn } = await exchangeForLongLivedToken({ shortToken, appId, appSecret });
    const accounts = await listAdAccounts(token);
    if (accounts.length === 0) return back('A Meta nao devolveu nenhuma conta de anuncios autorizada. Confira ads_read e a conta autorizada no painel Meta.');
    const accountOptions = accounts.map((account) => ({
      id: account.id, name: account.name, currency: account.currency || 'BRL', account_status: String(account.account_status || '')
    }));
    const now = new Date().toISOString();
    const admin = createAdmin();
    const { error: tokenError } = await admin.from('meta_ads_tokens').upsert({
      user_id: user.id,
      brand_id: brandId,
      access_token: token,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      account_options: accountOptions,
      selected_meta_account_id: accountOptions.length === 1 ? accountOptions[0].id : null,
      updated_at: now
    }, { onConflict: 'brand_id' });
    if (tokenError) throw new Error('Nao foi possivel salvar a autorizacao de anuncios.');
    if (accountOptions.length > 1) {
      return clearState(NextResponse.redirect(`${appUrl}${returnTo}?status=choose_account`));
    }
    const account = accountOptions[0];
    const { error: deactivateError } = await admin.from('meta_ad_accounts').update({ is_active: false }).eq('brand_id', brandId);
    if (deactivateError) throw new Error('Nao foi possivel preparar a conta de anuncios.');
    const { data: savedAccount, error: accountError } = await admin.from('meta_ad_accounts').upsert({
      brand_id: brandId,
      meta_account_id: account.id,
      name: account.name,
      currency: account.currency || 'BRL',
      account_status: String(account.account_status || ''),
      is_active: true
    }, { onConflict: 'brand_id,meta_account_id' }).select('id,currency').single();
    if (accountError || !savedAccount) throw new Error('Nao foi possivel salvar a conta de anuncios.');

    let warning = null;
    try {
      await syncPaidTraffic({ admin, brandId, account: { ...savedAccount, meta_account_id: account.id, currency: account.currency }, token });
    } catch (syncError) {
      warning = message(syncError);
    }
    revalidatePath('/paid-traffic');
    const query = new URLSearchParams({ status: 'connected' });
    if (warning) query.set('warning', `Conta conectada, mas a primeira leitura falhou: ${warning}`);
    return clearState(NextResponse.redirect(`${appUrl}${returnTo}?${query}`));
  } catch (error) {
    return back(message(error));
  }
}
