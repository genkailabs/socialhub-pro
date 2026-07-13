'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { collectSources } from '@/lib/ai/dna/collect';
import { buildDnaPrompt } from '@/lib/ai/dna/prompt';
import { normalizeDnaResult } from '@/lib/ai/dna/normalize';
import { deepseekChat } from '@/lib/ai/deepseek';
import { estimateCostUsd } from '@/lib/ai/cost';

export async function analyzeBrandDNA({ brandId, brandName, wantIg, websiteUrl, pastedText, manual }) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  try {
    const { sources, meta } = await collectSources({ brandId, wantIg, websiteUrl, pastedText, manual });
    const { system, user: userPrompt } = buildDnaPrompt({ brandName, sources });
    const out = await deepseekChat({ system, user: userPrompt, jsonMode: true });
    const result = normalizeDnaResult(out.content, { hasIg: meta.hasIg });

    const cost = estimateCostUsd(out.model, out.usage);
    const dnaSources = { ...meta, at: new Date().toISOString() };

    // persiste DNA no brand_kits (merge dos campos gerados) + relatório
    const row = {
      brand_id: brandId,
      ...pickDnaColumns(result.dna),
      dna_report: result.report,
      dna_sources: dnaSources,
      dna_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await supabase.from('brand_kits').upsert(row, { onConflict: 'brand_id' });

    await supabase.from('generation_jobs').insert({
      brand_id: brandId, kind: 'brand_dna', provider: 'deepseek', model: out.model,
      input_tokens: out.usage.prompt_tokens, output_tokens: out.usage.completion_tokens,
      cost_usd: cost, status: 'success'
    });

    revalidatePath('/brand-kit');
    return { ok: true, dna: result.dna, report: result.report, sources: dnaSources, cost };
  } catch (e) {
    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId, kind: 'brand_dna', provider: 'deepseek', model: 'deepseek-v4-flash',
        status: 'error', error: String(e.message).slice(0, 500)
      });
    } catch {}
    return { error: e.message };
  }
}

// só as colunas conhecidas do brand_kits (evita gravar chave inválida)
function pickDnaColumns(dna = {}) {
  const keys = ['niche','audience','tone','pillars','personality','emotions','formality','emoji_usage','cta_policy','storytelling','visual_style','caption_length'];
  const out = {};
  for (const k of keys) if (dna[k] !== undefined && dna[k] !== null) out[k] = dna[k];
  return out;
}
