'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage } from '@/lib/meta/graph';

export async function publishNow({ brandId, caption, imageUrl }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  if (!imageUrl) return { error: 'Envie uma imagem (o Instagram exige mídia).' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  // token do IG da marca (RLS garante posse)
  const { data: token } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id')
    .eq('brand_id', brandId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .maybeSingle();
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  try {
    const igMediaId = await publishInstagramImage({
      igId: token.platform_user_id,
      token: token.access_token,
      caption: caption || '',
      imageUrl
    });

    // registra o post publicado
    await supabase.from('posts').insert({
      brand_id: brandId,
      title: (caption || 'Post').slice(0, 60),
      content: caption || '',
      media_url: imageUrl,
      networks: ['instagram'],
      status: 'published',
      scheduled_at: new Date().toISOString()
    });

    revalidatePath('/dashboard');
    return { ok: true, id: igMediaId };
  } catch (e) {
    return { error: e.message };
  }
}
