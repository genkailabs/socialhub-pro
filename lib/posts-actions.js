'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { publishInstagramImage, publishInstagramCarousel, publishInstagramComment, publishInstagramStory, publishInstagramReel } from '@/lib/meta/graph';
import { validateInstagramMedia, composeCaption, isTempMediaPath, calculateDeleteAfter } from '@/lib/posts-media';
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

function normalizeFormat(format = 'image') {
  const f = String(format || 'image').toLowerCase();
  if (f.includes('stor')) return 'stories';
  if (f.includes('reel') || f.includes('video')) return 'reel';
  if (f.includes('carousel') || f.includes('carross')) return 'carousel';
  return 'image';
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

async function syncPostsMedia({ supabase, postId, brandId, mediaUrls, coverUrl, status, publishedAt }) {
  if (!postId || !brandId || !supabase) return;
  const urls = Array.isArray(mediaUrls) ? [...mediaUrls].filter(Boolean) : [];
  if (coverUrl && typeof coverUrl === 'string' && !urls.includes(coverUrl)) {
    urls.push(coverUrl);
  }
  if (!urls.length) return;

  const deleteAfter = calculateDeleteAfter(status, publishedAt || new Date().toISOString(), new Date().toISOString());

  const rows = urls.map((url, index) => {
    const isTemp = isTempMediaPath(url);
    const path = url.includes('/storage/v1/object/public/media/')
      ? url.split('/storage/v1/object/public/media/')[1]
      : url;
    const mediaType = url.match(/\.(mp4|mov)(\?.*)?$/i) ? 'video' : 'image';
    return {
      post_id: postId,
      brand_id: brandId,
      storage_bucket: 'media',
      storage_path: path,
      media_type: mediaType,
      position: index,
      temporary: isTemp,
      delete_after: deleteAfter
    };
  });

  try {
    await supabase.from('posts_media').insert(rows);
  } catch (err) {
    // best-effort
  }
}

export async function publishNow({
  brandId, caption, hashtags, firstComment, imageUrls, imageUrl, format = 'image',
  recommendationId, recommendation, approvalStatus, coverUrl = null,
  story_overlay_text, story_overlay_position, story_overlay_style,
  internal_reference_url, cover_storage_path, thumb_offset_ms, share_to_feed = true,
  editorState = null, altText = '', location = '', taggedPeople = ''
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const cleanFormat = normalizeFormat(format);
  const media = validateInstagramMedia(pickImages({ imageUrls, imageUrl }));
  if (!media.ok) return { error: media.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };
  const token = await getIgToken(supabase, brandId);
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const validation = validatePublication({ connected: Boolean(token), mediaUrls: media.urls, format: cleanFormat, approvalStatus });
  if (!validation.ok) return { error: validation.errors[0] };
  const fullCaption = composeCaption(caption, hashtags);
  try {
    let igMediaId;
    if (cleanFormat === 'stories') {
      const isVideo = !!media.urls[0].match(/\.(mp4|mov)(\?.*)?$/i);
      igMediaId = await publishInstagramStory({
        igId: token.platform_user_id,
        token: token.access_token,
        imageUrl: media.urls[0],
        isVideo
      });
    } else if (cleanFormat === 'reel') {
      igMediaId = await publishInstagramReel({
        igId: token.platform_user_id,
        token: token.access_token,
        videoUrl: media.urls[0],
        coverUrl: coverUrl,
        caption: fullCaption,
        shareToFeed: share_to_feed !== undefined ? Boolean(share_to_feed) : true
      });
    } else {
      igMediaId = media.kind === 'carousel'
        ? await publishInstagramCarousel({ igId: token.platform_user_id, token: token.access_token, caption: fullCaption, imageUrls: media.urls })
        : await publishInstagramImage({ igId: token.platform_user_id, token: token.access_token, caption: fullCaption, imageUrl: media.urls[0] });
    }

    if (firstComment && firstComment.trim()) {
      try { await publishInstagramComment({ token: token.access_token, mediaId: igMediaId, comment: firstComment }); } catch {}
    }

    const publishedAt = new Date().toISOString();
    const deleteAfter = calculateDeleteAfter('published', publishedAt, new Date().toISOString());

    const { data: postRow, error: insertError } = await supabase.from('posts').insert({
      brand_id: brandId,
      title: (caption || 'Post').slice(0, 60),
      content: fullCaption,
      media_url: media.urls[0],
      media_urls: media.urls,
      networks: ['instagram'],
      status: 'published',
      scheduled_at: publishedAt,
      format: cleanFormat,
      cover_url: coverUrl || null,
      story_overlay_text: story_overlay_text || null,
      story_overlay_position: story_overlay_position || null,
      story_overlay_style: story_overlay_style || null,
      internal_reference_url: internal_reference_url || null,
      cover_storage_path: cover_storage_path || null,
      thumb_offset_ms: thumb_offset_ms != null ? Number(thumb_offset_ms) : null,
      share_to_feed: share_to_feed !== undefined ? Boolean(share_to_feed) : true,
      delete_after: deleteAfter,
      ...(editorState && { production: { source: 'visual-composer', version: 1, editorState } })
    }).select('id').maybeSingle();

    if (postRow?.id) {
      await linkRecommendation({ supabase, postId: postRow.id, brandId, recommendationId, recommendation });
      await syncPostsMedia({ supabase, postId: postRow.id, brandId, mediaUrls: media.urls, coverUrl, status: 'published', publishedAt });
    }
    await recordDnaSignal({ brandId, postId: postRow?.id || null, action: 'approve' });
    revalidatePath('/calendar');
    revalidatePath('/dashboard');
    if (insertError) return { ok: true, id: igMediaId, warning: `Publicado no Instagram, mas não foi possível registrar o post: ${insertError.message}` };
    return { ok: true, id: igMediaId };
  } catch (e) {
    return { error: e.message };
  }
}

export async function schedulePost({
  brandId, caption, hashtags, firstComment = '', altText = '', imageUrls, imageUrl, scheduledAt, format = 'image',
  recommendationId, recommendation, approvalNotes = '', coverUrl = null,
  story_overlay_text, story_overlay_position, story_overlay_style,
  internal_reference_url, cover_storage_path, thumb_offset_ms, share_to_feed = true,
  editorState = null, location = '', taggedPeople = ''
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const cleanFormat = normalizeFormat(format);
  const media = validateInstagramMedia(pickImages({ imageUrls, imageUrl }));
  if (!media.ok) return { error: media.error };
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) return { error: 'Escolha uma data/hora no futuro.' };

  const validation = validatePublication({ connected: true, mediaUrls: media.urls, format: cleanFormat, scheduledAt: when });
  if (!validation.ok) return { error: validation.errors[0] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };
  const token = await getIgToken(supabase, brandId);
  if (!token) return { error: 'Instagram não conectado para esta marca.' };

  const fullCaption = composeCaption(caption, hashtags);
  const deleteAfter = calculateDeleteAfter('scheduled', null, new Date().toISOString());

  const { data: postRow, error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Post agendado').slice(0, 60),
    content: fullCaption,
    media_url: media.urls[0],
    media_urls: media.urls,
    networks: ['instagram'],
    status: 'scheduled',
    scheduled_at: when.toISOString(),
    format: cleanFormat,
    recommendation_id: recommendationId || null,
    approval_notes: approvalNotes || null,
    cover_url: coverUrl || null,
    story_overlay_text: story_overlay_text || null,
    story_overlay_position: story_overlay_position || null,
    story_overlay_style: story_overlay_style || null,
    internal_reference_url: internal_reference_url || null,
    cover_storage_path: cover_storage_path || null,
    thumb_offset_ms: thumb_offset_ms != null ? Number(thumb_offset_ms) : null,
    share_to_feed: share_to_feed !== undefined ? Boolean(share_to_feed) : true,
    delete_after: deleteAfter,
    ...(editorState && { production: { source: 'visual-composer', version: 1, editorState } })
  }).select('id').maybeSingle();
  if (error) return { error: `Não foi possível agendar: ${error.message}` };

  if (postRow?.id) {
    await linkRecommendation({ supabase, postId: postRow.id, brandId, recommendationId, recommendation });
    await syncPostsMedia({ supabase, postId: postRow.id, brandId, mediaUrls: media.urls, coverUrl, status: 'scheduled' });
  }
  await recordDnaSignal({ brandId, postId: postRow?.id || null, action: 'approve' });

  revalidatePath('/calendar');
  return { ok: true };
}

export async function saveDraft({
  brandId, draftId = null, caption, hashtags, firstComment = '', altText = '', imageUrls, imageUrl, format = 'image',
  recommendationId, recommendation, approvalNotes = '', coverUrl = null,
  story_overlay_text, story_overlay_position, story_overlay_style,
  internal_reference_url, cover_storage_path, thumb_offset_ms, share_to_feed = true,
  editorState = null, location = '', taggedPeople = ''
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const cleanFormat = normalizeFormat(format);
  const urls = pickImages({ imageUrls, imageUrl });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const fullCaption = composeCaption(caption, hashtags);
  const deleteAfter = calculateDeleteAfter('draft', null, new Date().toISOString());

  const draftRow = {
    brand_id: brandId,
    title: (caption || 'Rascunho').slice(0, 60),
    content: fullCaption,
    media_url: urls[0] || null,
    media_urls: urls,
    networks: ['instagram'],
    status: 'draft',
    scheduled_at: null,
    format: cleanFormat,
    recommendation_id: recommendationId || null,
    approval_notes: approvalNotes || null,
    cover_url: coverUrl || null,
    story_overlay_text: story_overlay_text || null,
    story_overlay_position: story_overlay_position || null,
    story_overlay_style: story_overlay_style || null,
    internal_reference_url: internal_reference_url || null,
    cover_storage_path: cover_storage_path || null,
    thumb_offset_ms: thumb_offset_ms != null ? Number(thumb_offset_ms) : null,
    share_to_feed: share_to_feed !== undefined ? Boolean(share_to_feed) : true,
    delete_after: deleteAfter,
    ...(editorState && { production: { source: 'visual-composer', version: 1, editorState } })
  };
  const query = draftId
    ? supabase.from('posts').update(draftRow).eq('id', draftId).eq('brand_id', brandId)
    : supabase.from('posts').insert(draftRow);
  const { data, error } = await query.select('id').single();
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  if (data?.id) {
    await linkRecommendation({ supabase, postId: data.id, brandId, recommendationId, recommendation });
    await syncPostsMedia({ supabase, postId: data.id, brandId, mediaUrls: urls, coverUrl, status: 'draft' });
  }
  await recordDnaSignal({ brandId, postId: data.id, action: 'edit' });

  revalidatePath('/calendar');
  return { ok: true, id: data.id };
}

export async function submitForApproval({
  brandId, caption, hashtags, imageUrls, imageUrl, format = 'image',
  recommendationId, recommendation, approvalNotes = '', coverUrl = null,
  story_overlay_text, story_overlay_position, story_overlay_style,
  internal_reference_url, cover_storage_path, thumb_offset_ms, share_to_feed = true
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const cleanFormat = normalizeFormat(format);
  const urls = pickImages({ imageUrls, imageUrl });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const fullCaption = composeCaption(caption, hashtags);
  const deleteAfter = calculateDeleteAfter('waiting_approval', null, new Date().toISOString());

  const { data, error } = await supabase.from('posts').insert({
    brand_id: brandId,
    title: (caption || 'Post').slice(0, 60),
    content: fullCaption,
    media_url: urls[0] || null,
    media_urls: urls,
    networks: ['instagram'],
    status: 'waiting_approval',
    scheduled_at: null,
    format: cleanFormat,
    recommendation_id: recommendationId || null,
    approval_notes: approvalNotes || null,
    cover_url: coverUrl || null,
    story_overlay_text: story_overlay_text || null,
    story_overlay_position: story_overlay_position || null,
    story_overlay_style: story_overlay_style || null,
    internal_reference_url: internal_reference_url || null,
    cover_storage_path: cover_storage_path || null,
    thumb_offset_ms: thumb_offset_ms != null ? Number(thumb_offset_ms) : null,
    share_to_feed: share_to_feed !== undefined ? Boolean(share_to_feed) : true,
    delete_after: deleteAfter
  }).select('id, approval_token').single();
  if (error) return { error: `Não foi possível enviar: ${error.message}` };

  if (data?.id) {
    await linkRecommendation({ supabase, postId: data.id, brandId, recommendationId, recommendation });
    await syncPostsMedia({ supabase, postId: data.id, brandId, mediaUrls: urls, coverUrl, status: 'waiting_approval' });
  }
  await recordDnaSignal({ brandId, postId: data.id, action: 'edit' });

  revalidatePath('/calendar');
  revalidatePath('/approvals');
  return { ok: true, id: data.id, token: data.approval_token };
}
