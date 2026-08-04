'use server';
import { createClient } from '@/lib/supabase/server';
import { getBrandKit } from '@/lib/brand-kit-data';
import { generateCreative } from '@/lib/ai/generate';
import { buildGenerationJobs } from '@/lib/ai/jobs';
import { recordBrandPreference } from '@/lib/brand-preferences-data';
import { beginProductionPackage, finishProductionPackage } from '@/lib/ai/governance';
import { DEFAULT_OPENROUTER_MODEL } from '@/lib/ai/openrouter';

// AI Studio (sob demanda): gera copy + imagens on-brand e devolve p/ o usuário
// escolher o destino (publicar/agendar/aprovar/rascunho). Não insere post aqui.
export async function generatePost({ brandId, brandName, brief, ignoreDna = false, composerContext = null, generateImages = false, maxImages = null, recommendationId = null }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // ignoreDna: gera "genérico" (sem Brand DNA) — atende critério do PRD.
  const kit = ignoreDna ? null : await getBrandKit(brandId);
  const { data: brand } = await supabase.from('brands').select('name, color').eq('id', brandId).maybeSingle();

  // A producao guiada pela recomendacao sempre nasce como um pacote fechado.
  // O Composer Manual continua usando o comportamento anterior.
  let productionPackage = null;
  if (recommendationId) {
    try {
      const reservation = await beginProductionPackage({ supabase, brandId, userId: user.id, recommendationId });
      if (!reservation.allowed) return { error: reservation.message, code: 'production_limit_reached' };
      productionPackage = reservation.productionPackage;
    } catch (e) {
      return { error: e.message, code: 'production_governance_unavailable' };
    }
  }

  try {
    const gen = await generateCreative({
      supabase, brandId,
      brandName: brandName || brand?.name,
      brandColor: brand?.color,
      kit,
      brief,
      composerContext,
      generateImages,
      maxImages: Number.isInteger(maxImages)
        ? Math.max(0, Math.min(maxImages, productionPackage?.image_limit ?? maxImages))
        : productionPackage?.image_limit ?? null,
      allowResearch: productionPackage?.research_allowed ?? true
    });

    // log de custo real (best-effort — núcleo honesto): pesquisa, texto e imagem separados
    try {
      await supabase.from('generation_jobs').insert(buildGenerationJobs({
        brandId, gen, textKind: productionPackage ? 'assistant_production' : 'post', userId: user.id,
        recommendationId, productionPackageId: productionPackage?.id || null, charged: Boolean(productionPackage)
      }));
    } catch {}

    // histórico de formato/tom usados (best-effort) — alimenta sugestões futuras
    await recordBrandPreference({ supabase, brandId, type: 'format', value: brief?.format });
    await recordBrandPreference({ supabase, brandId, type: 'tone', value: brief?.tone });

    await finishProductionPackage({ supabase, packageId: productionPackage?.id, status: 'completed', imageCount: gen.imageCount || 0 });
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
        provider: isResearch ? 'pollinations' : 'openrouter',
        model: isResearch ? 'gemini-search' : DEFAULT_OPENROUTER_MODEL,
        status: 'error', error: String(e.message).slice(0, 500), user_id: user.id,
        recommendation_id: recommendationId, production_package_id: productionPackage?.id || null,
        image_count: 0, research_performed: isResearch, charged: false
      });
    } catch {}
    // Falhas internas ficam registradas, mas o pacote nao e concluido e nao
    // entra na contagem mensal do plano.
    try { await finishProductionPackage({ supabase, packageId: productionPackage?.id, status: 'failed', error: e.message }); } catch {}
    // detail = diagnóstico técnico (§8). Quem consome decide se mostra; a
    // superfície do Composer só o exibe atrás de "ver detalhes técnicos".
    return { error: e.message, code: e.code, detail: e.detail || null };
  }
}
