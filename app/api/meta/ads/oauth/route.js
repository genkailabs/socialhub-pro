import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/meta/graph';
import { requestedAdsScopes } from '@/lib/meta/ads-scopes';
import { safeReturnTo } from '@/lib/oauth-return';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const appUrl = process.env.APP_URL || origin;
  const brandId = searchParams.get('brand_id');
  const returnTo = safeReturnTo(searchParams.get('return_to')) || '/paid-traffic';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);
  if (!brandId) return NextResponse.redirect(`${appUrl}/paid-traffic?error=${encodeURIComponent('Selecione uma marca antes de conectar a conta de anúncios.')}`);
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return NextResponse.redirect(`${appUrl}/paid-traffic?error=${encodeURIComponent('Marca inválida ou sem permissão.')}`);
  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(`${appUrl}/paid-traffic?error=${encodeURIComponent('Integração Meta não configurada no servidor.')}`);
  const state = Buffer.from(JSON.stringify({ brand_id: brandId, uid: user.id, t: Date.now(), rt: returnTo })).toString('base64');
  const authUrl = buildAuthUrl({
    appId,
    redirectUri: `${appUrl}/api/meta/ads/callback`,
    state,
    scopes: requestedAdsScopes().join(',')
  });
  return NextResponse.redirect(authUrl);
}
