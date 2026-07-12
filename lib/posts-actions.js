'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage, publishInstagramCarousel, publishInstagramComment } from '@/lib/meta/graph';
import { validateInstagramMedia, composeCaption } from '@/lib/posts-media';

async function getIgToken(supabase, brandId) {
  const { data } = await supabase
    .from('social_tokens')
    .select('access_token, platform_user_id')
    .eq('brand_id', brandId).eq('platform', 'instagram').eq('is_active', true)
    .maybeSingle();
  return data;
}

function pickImages({ imageUrls, imageUrl }) {
  if (Array.isArray(imageUrls) && imageUrls.length) return imageUrls;
  return imageUrl ? [imageUrl] : [];
}

export async function publishNow({ brandId, caption, hashtags, firstComment, imageUrls, imageUrl }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const media = validateInstagramMedia(pickImages({ imageUrls, imageUrl }));
  if (!media.ok) return { error: media.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };
  const token = await getIgToken(supabase, brandId);
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const fullCaption = composeCaption(caption, hashtags);
  try {
    const igMediaId = media.kind === 'carousel'
      ? await publishInstagramCarousel({ igId: token.platform_user_id, token: token.access_token, caption: fullCaption, imageUrls: media.urls })
      : await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: fullCaption, imageUrl: media.urls[0] });

    if (firstComment && firstComment.trim()) {
      // best-effort: o post já foi publicado; não falha o fluxo se o comentário der erro
      try { await publishInstagramComment({ token: token.access_token, mediaId: igMediaId, comment: firstComment }); } catch {}
    }

    await supabase.from('posts').insert({
      brand_id: brandId,
      title: (caption || 'Post').slice(0, 60),
      content: fullCaption,
      media_url: media.urls[0],
      media_urls: media.urls,
      networks: ['instagram'],
      status: 'published',
      scheduled_at: new Date().toISOString()
    });

    revalidatePath('/dashboard');
    revalidatePath('/calendar');
    return { ok: true, id: igMediaId };
  } catch (e) {
    return { error: e.message };
  }
}

export async function schedulePost({ brandId, caption, hashtags, imageUrls, imageUrl, scheduledAt }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const media = validateInstagramMedia(pickImages({ imageUrls, imageUrl }));
  if (!media.ok) return { error: media.error };
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) return { error: 'Escolha uma data/hora no futuro.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };
  const token = await getIgToken(supabase, brandId);
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const fullCaption = composeCaption(caption, hashtags);
  const { error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Post agendado').slice(0, 60),
    content: fullCaption,
    media_url: media.urls[0],
    media_urls: media.urls,
    networks: ['instagram'],
    status: 'scheduled',
    scheduled_at: when.toISOString()
  });
  if (error) return { error: `Não foi possível agendar: ${error.message}` };

  revalidatePath('/calendar');
  return { ok: true };
}

// Salva sem publicar (rascunho editável no Calendário).
export async function saveDraft({ brandId, caption, hashtags, imageUrls, imageUrl }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const urls = pickImages({ imageUrls, imageUrl });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const fullCaption = composeCaption(caption, hashtags);
  const { data, error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Rascunho').slice(0, 60),
    content: fullCaption,
    media_url: urls[0] || null,
    media_urls: urls,
    networks: ['instagram'],
    status: 'draft',
    scheduled_at: null
  }).select('id').single();
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath('/calendar');
  return { ok: true, id: data.id };
}

// Cria o post e já gera o link público de aprovação do cliente.
export async function submitForApproval({ brandId, caption, hashtags, imageUrls, imageUrl }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const urls = pickImages({ imageUrls, imageUrl });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const fullCaption = composeCaption(caption, hashtags);
  const { data, error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Post').slice(0, 60),
    content: fullCaption,
    media_url: urls[0] || null,
    media_urls: urls,
    networks: ['instagram'],
    status: 'waiting_approval',
    scheduled_at: null
  }).select('id, approval_token').single();
  if (error) return { error: `Não foi possível enviar: ${error.message}` };

  revalidatePath('/calendar');
  revalidatePath('/approvals');
  return { ok: true, id: data.id, token: data.approval_token };
}
