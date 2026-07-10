import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/meta/graph';

const DEFAULT_SCOPES = [
  'public_profile', 'pages_show_list', 'pages_read_engagement',
  'instagram_basic', 'instagram_content_publish', 'business_management'
].join(',');

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const brandId = searchParams.get('brand_id');
  const appUrl = process.env.APP_URL || origin;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  // Valida posse da marca (RLS: só retorna se for do usuário)
  if (!brandId) return NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent('Selecione uma marca antes de conectar.')}`);
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent('Marca inválida ou sem permissão.')}`);

  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent('Integração Meta não configurada (META_APP_ID ausente).')}`);

  const state = Buffer.from(JSON.stringify({ brand_id: brandId, uid: user.id, t: Date.now() })).toString('base64');
  const authUrl = buildAuthUrl({
    appId,
    redirectUri: `${appUrl}/api/meta/callback`,
    state,
    scopes: process.env.META_OAUTH_SCOPES || DEFAULT_SCOPES
  });
  return NextResponse.redirect(authUrl);
}
