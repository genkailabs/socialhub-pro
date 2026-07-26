'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';
import { syncPaidTraffic } from '@/lib/paid-traffic/sync';

function message(error) {
  return String(error?.message || 'Falha ao sincronizar a conta escolhida.').replace(/access_token=[^&\s]+/gi, 'access_token=[removido]');
}

export async function selectPaidTrafficAccount(formData) {
  const brandId = String(formData.get('brand_id') || '');
  const accountId = String(formData.get('account_id') || '');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !brandId || !accountId) redirect('/paid-traffic?error=Selecao%20invalida.');
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) redirect('/paid-traffic?error=Marca%20invalida%20ou%20sem%20permissao.');

  const admin = createAdmin();
  const { data: authorization } = await admin.from('meta_ads_tokens')
    .select('access_token,account_options')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle();
  const account = Array.isArray(authorization?.account_options)
    ? authorization.account_options.find((item) => item?.id === accountId)
    : null;
  if (!authorization?.access_token || !account) redirect('/paid-traffic?error=Escolha%20uma%20conta%20da%20lista%20autorizada.');

  const { error: deactivateError } = await admin.from('meta_ad_accounts').update({ is_active: false }).eq('brand_id', brandId);
  if (deactivateError) redirect('/paid-traffic?error=Nao%20foi%20possivel%20preparar%20a%20conta%20de%20anuncios.');
  const { data: savedAccount, error: accountError } = await admin.from('meta_ad_accounts').upsert({
    brand_id: brandId,
    meta_account_id: account.id,
    name: account.name,
    currency: account.currency || 'BRL',
    account_status: String(account.account_status || ''),
    is_active: true
  }, { onConflict: 'brand_id,meta_account_id' }).select('id,currency').single();
  if (accountError || !savedAccount) redirect('/paid-traffic?error=Nao%20foi%20possivel%20salvar%20a%20conta%20escolhida.');
  const { error: selectionError } = await admin.from('meta_ads_tokens').update({ account_options: null, selected_meta_account_id: account.id })
    .eq('brand_id', brandId).eq('user_id', user.id);
  if (selectionError) redirect('/paid-traffic?error=Nao%20foi%20possivel%20confirmar%20a%20conta%20escolhida.');

  let warning = null;
  try {
    await syncPaidTraffic({ admin, brandId, account: { ...savedAccount, meta_account_id: account.id, currency: account.currency || 'BRL' }, token: authorization.access_token });
  } catch (error) {
    warning = `Conta escolhida, mas a primeira leitura falhou: ${message(error)}`;
  }
  revalidatePath('/paid-traffic');
  redirect(warning ? `/paid-traffic?warning=${encodeURIComponent(warning)}` : '/paid-traffic?status=connected');
}
