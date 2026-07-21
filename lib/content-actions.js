'use server';
import { revalidatePath } from 'next/cache';
import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { runSkill } from '@/lib/ai/skills/run';
import { postProducerSkill } from '@/lib/ai/skills/post-producer';
import { reelProducerSkill } from '@/lib/ai/skills/reel-producer';
import { storyPlannerSkill } from '@/lib/ai/skills/story-planner';
import { contentReviewSkill } from '@/lib/ai/skills/content-review';
import { buildArt } from '@/lib/ai/art/pipeline';
import { artFonts } from '@/lib/ai/art/fonts';
import {
  artSizeForFormat, rendersArtwork, statusAfterReview, statusAfterApproval,
  reviewableContent, contentTitle, contentBody, artworkCount, artContentFor, mediaTypeFor
} from '@/lib/content-production';
import { scheduleIsoFromPlanning } from '@/lib/planning-times';

const PRODUCERS = {
  image: postProducerSkill,
  carousel: postProducerSkill,
  reel: reelProducerSkill,
  stories: storyPlannerSkill
};

function dnaFrom(kit) {
  return {
    tone: kit?.tone || '',
    audience: kit?.audience || '',
    personality: kit?.personality || [],
    emojiUsage: kit?.emoji_usage || '',
    captionLength: kit?.caption_length || '',
    ctaPolicy: kit?.cta_policy || '',
    donts: kit?.donts || [],
    professionalRules: []
  };
}

// Gera a arte on-brand via next/og (custo zero). A imagem por IA continua sendo
// escolha do usuário na tela de revisão — produzir em lote cobraria por arte que
// talvez seja descartada.
//
// Post, Carrossel e Story passam pelo MESMO pipeline (§13-19): muda o tamanho da
// moldura, não o renderizador. Story com composição própria seria a "arte de
// Story" genérica que o PRD proíbe.
async function renderArtwork({ supabase, brandId, format, production, kit, brandColor, brandHandle }) {
  const n = artworkCount(format, production);
  if (!n) return [];

  const size = artSizeForFormat(format);
  const niche = kit?.niche || kit?.segment || '';
  // §15: dentro da mesma sequência, uma tela não repete a composição da anterior.
  const recentLayouts = [];
  const urls = [];
  const issues = [];

  for (let i = 0; i < n; i++) {
    const art = buildArt({
      content: artContentFor(format, production, i, brandHandle),
      kit,
      brandColor,
      niche,
      size,
      recentLayouts,
      seed: i
    });
    recentLayouts.unshift(art.layout.id);
    if (!art.ok) issues.push({ slide: i, report: art.report });

    const img = new ImageResponse(art.node, { width: art.size.width, height: art.size.height, fonts: artFonts() });
    const bytes = Buffer.from(await img.arrayBuffer());
    const path = `${brandId}/content-${Date.now()}-${i}.png`;
    const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(`Upload da arte: ${error.message}`);
    urls.push(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
  }
  return { urls, issues };
}

// Produz o conteúdo de um tema aprovado (PRD Etapa 10 / §11.1).
//
// Ordem: carregar tema -> produtor do formato -> revisão -> salvar.
// Só tema aprovado chega aqui (RF-07): produzir o que o usuário vai descartar
// é gastar IA à toa.
export async function produceFromPlanItem({ itemId, adjustment = '' }) {
  if (!itemId) return { error: 'Tema não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // RLS garante que o item é de uma marca do usuário.
  const { data: item } = await supabase
    .from('editorial_plan_items')
    .select('id, plan_id, date, suggested_time, format, topic, title, objective, pillar, stage, cta, status, post_id, editorial_plans(brand_id)')
    .eq('id', itemId)
    .maybeSingle();

  if (!item) return { error: 'Tema não encontrado.' };
  if (item.status !== 'approved') return { error: 'Aprove o tema antes de produzir o conteúdo.' };
  if (item.post_id) return { error: 'Este tema já virou conteúdo.' };

  const brandId = item.editorial_plans?.brand_id;
  if (!brandId) return { error: 'Marca do plano não encontrada.' };

  const skill = PRODUCERS[item.format];
  if (!skill) return { error: `Ainda não sabemos produzir o formato "${item.format}".` };

  const { data: brand } = await supabase.from('brands').select('id, name, color').eq('id', brandId).maybeSingle();
  const { data: kit } = await supabase.from('brand_kits').select('*').eq('brand_id', brandId).maybeSingle();

  const { data: acquiredItem, error: productionStartError } = await supabase.from('editorial_plan_items')
    .update({ status: 'in_production', production_error: null })
    .eq('id', itemId)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (productionStartError) return { error: productionStartError.message };
  if (!acquiredItem) return { error: 'Aprove o tema antes de produzir o conteúdo.' };

  try {
    const dna = dnaFrom(kit);
    const base = {
      brandName: brand.name,
      topic: item.topic,
      objective: item.objective || '',
      pillar: item.pillar || '',
      cta: item.cta || '',
      dna,
      adjustment
    };
    // post-producer precisa do formato e do estágio; os outros não.
    const input = skill === postProducerSkill
      ? { ...base, format: item.format, title: item.title || '', stage: item.stage || 'descoberta' }
      : base;

    const { data: production, cost: prodCost } = await runSkill({
      skill, input, supabase, brandId, userId: user.id
    });

    // Revisão logo após produzir: publicar sem conferir é o risco que a Etapa 11
    // existe para reduzir.
    const { data: recentes } = await supabase
      .from('posts')
      .select('content')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(5);

    let review = null;
    let reviewCost = 0;
    try {
      const res = await runSkill({
        skill: contentReviewSkill,
        input: {
          brandName: brand.name,
          topic: item.topic,
          content: reviewableContent(item.format, production),
          dna,
          recentCaptions: (recentes || []).map((p) => p.content).filter(Boolean)
        },
        supabase, brandId, userId: user.id
      });
      review = res.data;
      reviewCost = res.cost;
    } catch {
      // Revisão é proteção, não portão: falhar aqui não pode descartar um
      // conteúdo que já foi pago. Segue sem veredito e o usuário decide.
    }

    const handle = String(brand.name || 'marca').replace(/\s+/g, '').toLowerCase();
    const { urls: imageUrls } = rendersArtwork(item.format)
      ? await renderArtwork({ supabase, brandId, format: item.format, production, kit, brandColor: brand.color, brandHandle: handle })
      : { urls: [] };

    const { data: post, error } = await supabase.from('posts').insert({
      brand_id: brandId,
      title: contentTitle(item.format, production, item.title),
      content: contentBody(item.format, production),
      format: item.format,
      production,
      review,
      media_url: imageUrls[0] || null,
      media_urls: imageUrls,
      media_type: mediaTypeFor(item.format, imageUrls),
      networks: ['instagram'],
      status: statusAfterReview(review),
      scheduled_at: scheduleIsoFromPlanning(item.date, item.suggested_time)
    }).select('id').maybeSingle();

    if (error) throw new Error(`Conteúdo gerado, mas não foi possível salvar: ${error.message}`);

    const { error: readyError } = await supabase.from('editorial_plan_items')
      .update({ post_id: post.id, status: 'ready', production_error: null })
      .eq('id', itemId);
    if (readyError) throw new Error(readyError.message);

    revalidatePath('/planning');
    revalidatePath('/approvals');
    revalidatePath('/calendar');
    return { ok: true, postId: post.id, cost: prodCost + reviewCost, blocked: review?.decision === 'bloqueado' };
  } catch (e) {
    const error = e instanceof Error && e.message ? e.message : 'Não foi possível produzir o conteúdo.';
    await supabase.from('editorial_plan_items')
      .update({ status: 'approved', production_error: error })
      .eq('id', itemId);
    return { error };
  }
}

// Cada item é produzido separadamente: a falha de um não impede os demais.
export async function produceApprovedPlanItems({ planId }) {
  if (!planId) return { results: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { results: [] };

  const { data: items, error } = await supabase
    .from('editorial_plan_items')
    .select('id')
    .eq('plan_id', planId)
    .eq('status', 'approved');
  if (error) return { results: [] };

  const results = [];
  for (const item of items || []) {
    try {
      const result = await produceFromPlanItem({ itemId: item.id });
      if (result?.ok) results.push({ itemId: item.id, ok: true });
      else results.push({ itemId: item.id, ok: false, error: result?.error || 'Não foi possível produzir o conteúdo.' });
    } catch (e) {
      results.push({ itemId: item.id, ok: false, error: e instanceof Error ? e.message : 'Não foi possível produzir o conteúdo.' });
    }
  }
  return { results };
}

// Editar manualmente não chama IA e não custa nada (RF-08).
export async function updateContent({ postId, patch }) {
  if (!postId) return { error: 'Conteúdo não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const row = {};
  if (patch?.title !== undefined) row.title = String(patch.title).slice(0, 60);
  if (patch?.content !== undefined) row.content = patch.content;
  if (patch?.production !== undefined) row.production = patch.production;
  if (!Object.keys(row).length) return { error: 'Nada para atualizar.' };

  const { error } = await supabase.from('posts').update(row).eq('id', postId);
  if (error) return { error: error.message };

  revalidatePath(`/content/${postId}/review`);
  return { ok: true };
}

// Aprovar decide o destino conforme o formato (§5.1): publicável vai para
// agendamento; Reel e Stories vão para o usuário postar.
export async function approveContent({ postId }) {
  if (!postId) return { error: 'Conteúdo não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: post } = await supabase.from('posts').select('id, format, brand_id').eq('id', postId).maybeSingle();
  if (!post) return { error: 'Conteúdo não encontrado.' };

  const status = statusAfterApproval(post.format);
  const { error } = await supabase.from('posts').update({ status }).eq('id', postId);
  if (error) return { error: error.message };

  revalidatePath('/approvals');
  revalidatePath('/calendar');
  return { ok: true, status };
}

// O usuário confirma que postou Reel/Stories com as próprias mãos.
export async function markPostedManually({ postId }) {
  if (!postId) return { error: 'Conteúdo não informado.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('posts')
    .update({ status: 'posted_manually', scheduled_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('status', 'ready_to_post');
  if (error) return { error: error.message };

  revalidatePath('/calendar');
  return { ok: true };
}
