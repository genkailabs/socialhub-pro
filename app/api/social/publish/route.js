import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage, publishFacebookPhoto } from '@/lib/meta/graph';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { brand_id, caption, image_url } = body;
  const platform = body.platform || 'instagram';
  if (!brand_id) return NextResponse.json({ success: false, error: 'brand_id obrigatório' }, { status: 400 });
  if (!['instagram', 'facebook'].includes(platform)) {
    return NextResponse.json({ success: false, error: `Plataforma não suportada: ${platform}` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id')
    .eq('brand_id', brand_id)
    .eq('platform', platform)
    .eq('is_active', true)
    .maybeSingle();

  const label = platform === 'facebook' ? 'Facebook' : 'Instagram';
  if (!token) return NextResponse.json({ success: false, error: `${label} não conectado para esta marca.` }, { status: 400 });
  if (!image_url) return NextResponse.json({ success: false, error: `image_url obrigatório (${label} exige mídia).` }, { status: 400 });

  try {
    const id = platform === 'facebook'
      ? await publishFacebookPhoto({ pageId: token.platform_user_id, pageToken: token.access_token, message: caption || '', imageUrl: image_url })
      : await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: caption || '', imageUrl: image_url });
    return NextResponse.json({ success: true, id, published_at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 502 });
  }
}
