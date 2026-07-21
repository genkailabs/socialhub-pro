import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/youtube/google';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const brandId = searchParams.get('brand_id');
  const appUrl = process.env.APP_URL || origin;
  const err = (msg) => NextResponse.redirect(`${appUrl}/connections?error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  if (!brandId) return err('Selecione uma marca antes de conectar.');
  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return err('Marca inválida ou sem permissão.');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return err('Integração YouTube não configurada (GOOGLE_CLIENT_ID ausente).');

  const state = Buffer.from(JSON.stringify({ brand_id: brandId, uid: user.id, t: Date.now() })).toString('base64');
  const authUrl = buildAuthUrl({
    clientId,
    redirectUri: `${appUrl}/api/youtube/callback`,
    state
  });
  return NextResponse.redirect(authUrl);
}
