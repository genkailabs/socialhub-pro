'use server';
import { createClient } from '@/lib/supabase/server';
import { getBrandKit } from '@/lib/brand-kit-data';
import { generateCreative, generateNewsImageOptions } from '@/lib/ai/generate';
import { buildGenerationJobs } from '@/lib/ai/jobs';
import { renderNewsTitleOverlay } from '@/lib/ai/news-image-render';
import { titleOverlayNeeded } from '@/lib/ai/news-image';

// AI Studio (sob demanda): gera copy + imagens on-brand e devolve p/ o usuário
// escolher o destino (publicar/agendar/aprovar/rascunho). Não insere post aqui.
export async function generatePost({ brandId, brandName, brief, ignoreDna = false }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // ignoreDna: gera "genérico" (sem Brand DNA) — atende critério do PRD.
  const kit = ignoreDna ? null : await getBrandKit(brandId);
  const { data: brand } = await supabase.from('brands').select('name, color').eq('id', brandId).maybeSingle();

  try {
    const gen = await generateCreative({
      supabase, brandId,
      brandName: brandName || brand?.name,
      brandColor: brand?.color,
      kit,
      brief,
      generateImages: false
    });

    // log de custo real (best-effort — núcleo honesto): pesquisa, texto e imagem separados
    try {
      await supabase.from('generation_jobs').insert(buildGenerationJobs({ brandId, gen, textKind: 'post' }));
    } catch {}

    return {
      ok: true,
      spec: gen.spec,
      imageUrls: gen.imageUrls,
      cost: gen.cost,
      textCost: gen.textCost || 0,
      imageCost: gen.imageCost || 0,
      usage: gen.usage || {},
      imageProvider: gen.imageProvider
    };
  } catch (e) {
    // registra a falha — núcleo honesto. Falha de pesquisa vira linha 'research';
    // demais falhas (ex: sem crédito) ficam na linha 'post'. Nenhum rascunho é criado.
    const isResearch = e.code === 'research_unavailable';
    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId,
        kind: isResearch ? 'research' : 'post',
        provider: isResearch ? 'tavily' : 'deepseek',
        model: isResearch ? 'tavily-search' : 'deepseek-v4-flash',
        status: 'error', error: String(e.message).slice(0, 500)
      });
    } catch {}
    return { error: e.message, code: e.code };
  }
}

export async function generateNewsImages({ brandId, topic, caption, direction }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  try {
    const result = await generateNewsImageOptions({ supabase, brandId, topic, caption, direction });
    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId, kind: 'image', provider: result.imageProvider, model: result.imageModel,
        cost_usd: result.imageCost, status: 'success'
      });
    } catch {}
    return { ok: true, ...result };
  } catch (e) {
    return { error: e.message };
  }
}

export async function finalizeNewsImage({ brandId, sourceUrl, title, textEnabled, position }) {
  if (!brandId || !sourceUrl) return { error: 'Escolha uma imagem primeiro.' };
  if (!titleOverlayNeeded({ textEnabled, title })) return { ok: true, imageUrl: sourceUrl };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  try {
    const image = await renderNewsTitleOverlay({ sourceUrl, title, position });
    const path = `${brandId}/news-final-${Date.now()}.png`;
    const { error } = await supabase.storage.from('media').upload(path, image.bytes, {
      contentType: image.contentType,
      upsert: true
    });
    if (error) throw new Error(`Upload da imagem: ${error.message}`);
    return { ok: true, imageUrl: supabase.storage.from('media').getPublicUrl(path).data.publicUrl };
  } catch (e) {
    return { error: e.message };
  }
}
