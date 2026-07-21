'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage, publishInstagramCarousel, publishInstagramComment } from '@/lib/meta/graph';
import { validateInstagramMedia, composeCaption } from '@/lib/posts-media';
import { recordDnaSignal } from '@/lib/dna-signals';
import { validatePublication } from '@/lib/publication-learning';

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

async function linkRecommendation({ supabase, postId, brandId, recommendationId, recommendation }) {
  if (!postId || !recommendationId || !recommendation) return;
  const plan = recommendation.contentPlan || {};
  const evidence = Array.isArray(recommendation.evidence) ? recommendation.evidence[0] : null;
  await supabase.from('publication_learning').upsert({
    post_id: postId, recommendation_id: recommendationId, brand_id: brandId,
    hypothesis: recommendation.recommendation || recommendation.meaning || 'Testar a recomendação do Assistente.',
    metric_name: evidence?.metric || null, baseline_value: evidence?.currentValue ?? null,
    topic: plan.topic || null, format: plan.format || null, pillar: plan.pillar || null
  }, { onConflict: 'post_id' });
  await supabase.from('marketing_recommendations').update({ status: 'content_created' }).eq('id', recommendationId);
}

export async function publishNow({ brandId, caption, hashtags, firstComment, imageUrls, imageUrl, format = 'image', recommendationId, recommendation, approvalStatus }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const media = validateInstagramMedia(pickImages({ imageUrls, imageUrl }));
  if (!media.ok) return { error: media.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };
  const token = await getIgToken(supabase, brandId);
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const validation = validatePublication({ connected: Boolean(token), mediaUrls: media.urls, format, approvalStatus });
  if (!validation.ok) return { error: validation.errors[0] };
  const fullCaption = composeCaption(caption, hashtags);
  try {
    const igMediaId = media.kind === 'carousel'
      ? await publishInstagramCarousel({ igId: token.platform_user_id, token: token.access_token, caption: fullCaption, imageUrls: media.urls })
      : await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: fullCaption, imageUrl: media.urls[0] });

    if (firstComment && firstComment.trim()) {
      // best-effort: o post já foi publicado; não falha o fluxo se o comentário der erro
      try { await publishInstagramComment({ token: token.access_token, mediaId: igMediaId, comment: firstComment }); } catch {}
    }

    const { data: postRow, error: insertError } = await supabase.from('posts').insert({
      brand_id: brandId,
      title: (caption || 'Post').slice(0, 60),
      content: fullCaption,
      media_url: media.urls[0],
      media_urls: media.urls,
      networks: ['instagram'],
      status: 'published',
      scheduled_at: new Date().toISOString()
    }).select('id').maybeSingle();

    await linkRecommendation({ supabase, postId: postRow?.id, brandId, recommendationId, recommendation });
    await recordDnaSignal({ brandId, postId: postRow?.id || null, action: 'approve' });

    revalidatePath('/dashboard');
    revalidatePath('/calendar');
    // O post já está no ar: falha aqui é só de registro, então não vira erro do
    // fluxo — mas precisa aparecer, senão o post some do calendário em silêncio.
    if (insertError) return { ok: true, id: igMediaId, warning: `Publicado no Instagram, mas não foi possível registrar o post: ${insertError.message}` };
    return { ok: true, id: igMediaId };
  } catch (e) {
    return { error: e.message };
  }
}

export async function schedulePost({ brandId, caption, hashtags, imageUrls, imageUrl, scheduledAt, format = 'image', recommendationId, recommendation, approvalNotes = '' }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const media = validateInstagramMedia(pickImages({ imageUrls, imageUrl }));
  if (!media.ok) return { error: media.error };
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) return { error: 'Escolha uma data/hora no futuro.' };

  const validation = validatePublication({ connected: true, mediaUrls: media.urls, format, scheduledAt: when });
  if (!validation.ok) return { error: validation.errors[0] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };
  const token = await getIgToken(supabase, brandId);
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const fullCaption = composeCaption(caption, hashtags);
  const { data: postRow, error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Post agendado').slice(0, 60),
    content: fullCaption,
    media_url: media.urls[0],
    media_urls: media.urls,
    networks: ['instagram'],
    status: 'scheduled',
    scheduled_at: when.toISOString(), format, recommendation_id: recommendationId || null, approval_notes: approvalNotes || null
  }).select('id').maybeSingle();
  if (error) return { error: `Não foi possível agendar: ${error.message}` };

  await linkRecommendation({ supabase, postId: postRow?.id, brandId, recommendationId, recommendation });
  await recordDnaSignal({ brandId, postId: postRow?.id || null, action: 'approve' });

  revalidatePath('/calendar');
  return { ok: true };
}

// Salva sem publicar (rascunho editável no Calendário).
export async function saveDraft({ brandId, caption, hashtags, imageUrls, imageUrl, format = 'image', recommendationId, recommendation, approvalNotes = '' }) {
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
    scheduled_at: null, format, recommendation_id: recommendationId || null, approval_notes: approvalNotes || null
  }).select('id').single();
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  await linkRecommendation({ supabase, postId: data.id, brandId, recommendationId, recommendation });
  await recordDnaSignal({ brandId, postId: data.id, action: 'edit' });

  revalidatePath('/calendar');
  return { ok: true, id: data.id };
}

// Cria o post e já gera o link público de aprovação do cliente.
export async function submitForApproval({ brandId, caption, hashtags, imageUrls, imageUrl, format = 'image', recommendationId, recommendation, approvalNotes = '' }) {
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
    scheduled_at: null, format, recommendation_id: recommendationId || null, approval_notes: approvalNotes || null
  }).select('id, approval_token').single();
  if (error) return { error: `Não foi possível enviar: ${error.message}` };

  await linkRecommendation({ supabase, postId: data.id, brandId, recommendationId, recommendation });
  await recordDnaSignal({ brandId, postId: data.id, action: 'edit' });

  revalidatePath('/calendar');
  revalidatePath('/approvals');
  return { ok: true, id: data.id, token: data.approval_token };
}
