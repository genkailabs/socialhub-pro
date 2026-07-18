'use server';
import { createClient } from '@/lib/supabase/server';
import { getBrandKit } from '@/lib/brand-kit-data';
import { generateCreative, generateNewsImageOptions } from '@/lib/ai/generate';
import { buildGenerationJobs } from '@/lib/ai/jobs';
import { renderNewsTitleOverlay } from '@/lib/ai/news-image-render';
import { titleOverlayNeeded } from '@/lib/ai/news-image';
import { deepseekChat } from '@/lib/ai/deepseek';
import { buildSuggestionsPrompt, parseSuggestions } from '@/lib/ai/suggestions';
import { estimateCostUsd } from '@/lib/ai/cost';

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
        provider: isResearch ? 'pollinations' : 'deepseek',
        model: isResearch ? 'gemini-search' : 'deepseek-v4-flash',
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

// Comunicação adaptativa: 4 ângulos de conteúdo sugeridos p/ o tema + nicho da
// marca (Composer). Aparecem como chips de 1 clique; o usuário pode ignorar e
// digitar formato/tom livres. Custo logado como as demais chamadas de IA.
export async function getContentSuggestions({ brandId, topic }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  if (!String(topic || '').trim()) return { ok: true, suggestions: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  try {
    const kit = await getBrandKit(brandId);
    const { system, user: userPrompt } = buildSuggestionsPrompt({ topic, niche: kit?.niche });
    const out = await deepseekChat({ system, user: userPrompt });
    const suggestions = parseSuggestions(out.content);

    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId, kind: 'suggestions', provider: 'deepseek', model: out.model,
        input_tokens: out.usage.prompt_tokens || 0, output_tokens: out.usage.completion_tokens || 0,
        cost_usd: estimateCostUsd(out.model, out.usage), status: 'success'
      });
    } catch {}

    return { ok: true, suggestions };
  } catch (e) {
    return { error: e.message };
  }
}
