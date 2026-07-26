import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/meta/graph';
import { scopeString } from '@/lib/meta/scopes';
import { safeReturnTo } from '@/lib/oauth-return';

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

  // O return_to viaja dentro do state porque a Meta só devolve o que mandamos
  // nele. Antes disto o parâmetro era montado por connectHref e descartado
  // aqui, então quem conectava a partir de outra tela sempre caía em /connections.
  const returnTo = safeReturnTo(searchParams.get('return_to'));
  const state = Buffer.from(
    JSON.stringify({ brand_id: brandId, uid: user.id, t: Date.now(), rt: returnTo })
  ).toString('base64');
  const authUrl = buildAuthUrl({
    appId,
    redirectUri: `${appUrl}/api/meta/callback`,
    state,
    scopes: process.env.META_OAUTH_SCOPES || scopeString()
  });
  return NextResponse.redirect(authUrl);
}
