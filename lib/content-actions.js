'use server';
import { revalidatePath } from 'next/cache';
import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { runSkill } from '@/lib/ai/skills/run';
import { postProducerSkill } from '@/lib/ai/skills/post-producer';
import { reelProducerSkill } from '@/lib/ai/skills/reel-producer';
import { storyPlannerSkill } from '@/lib/ai/skills/story-planner';
import { contentReviewSkill } from '@/lib/ai/skills/content-review';
import { renderNode } from '@/lib/ai/render';
import { resolvePalette } from '@/lib/ai/templates';
import {
  templateForFormat, rendersArtwork, statusAfterReview, statusAfterApproval,
  reviewableContent, contentTitle, contentBody, artworkCount
} from '@/lib/content-production';

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
// escolha do usuário na tela de revisão — produzir em lote com deAPI cobraria
// por arte que talvez seja descartada.
async function renderArtwork({ supabase, brandId, format, production, palette, brandHandle }) {
  const n = artworkCount(format, production);
  if (!n) return [];

  const template = templateForFormat(format);
  const spec = {
    template,
    brand: brandHandle,
    headline: production.hook || '',
    subtext: production.caption?.slice(0, 220) || '',
    bullets: (production.slides || []).map((s) => s.title).filter(Boolean),
    slides: n
  };

  const urls = [];
  for (let i = 0; i < n; i++) {
    const img = new ImageResponse(renderNode({ template, spec, palette, slideIndex: i }), { width: 1080, height: 1080 });
    const bytes = Buffer.from(await img.arrayBuffer());
    const path = `${brandId}/content-${Date.now()}-${i}.png`;
    const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(`Upload da arte: ${error.message}`);
    urls.push(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
  }
  return urls;
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
    .select('id, plan_id, date, format, topic, title, objective, pillar, stage, cta, status, post_id, editorial_plans(brand_id)')
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

    const palette = resolvePalette({ ...(kit?.palette || {}), accent: kit?.palette?.accent || brand.color });
    const handle = String(brand.name || 'marca').replace(/\s+/g, '').toLowerCase();
    const imageUrls = rendersArtwork(item.format)
      ? await renderArtwork({ supabase, brandId, format: item.format, production, palette, brandHandle: handle })
      : [];

    const { data: post, error } = await supabase.from('posts').insert({
      brand_id: brandId,
      title: contentTitle(item.format, production, item.title),
      content: contentBody(item.format, production),
      format: item.format,
      production,
      review,
      media_url: imageUrls[0] || null,
      media_urls: imageUrls,
      media_type: imageUrls.length > 1 ? 'carousel' : imageUrls.length ? 'image' : null,
      networks: ['instagram'],
      status: statusAfterReview(review),
      scheduled_at: null
    }).select('id').maybeSingle();

    if (error) return { error: `Conteúdo gerado, mas não foi possível salvar: ${error.message}` };

    await supabase.from('editorial_plan_items')
      .update({ post_id: post.id, status: 'produced' })
      .eq('id', itemId);

    revalidatePath('/planning');
    revalidatePath('/approvals');
    revalidatePath('/calendar');
    return { ok: true, postId: post.id, cost: prodCost + reviewCost, blocked: review?.decision === 'bloqueado' };
  } catch (e) {
    return { error: e.message };
  }
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
