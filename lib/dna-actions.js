'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { collectSources } from '@/lib/ai/dna/collect';
import { buildDnaPrompt } from '@/lib/ai/dna/prompt';
import { normalizeDnaResult } from '@/lib/ai/dna/normalize';
import { deepseekChat } from '@/lib/ai/deepseek';
import { estimateCostUsd } from '@/lib/ai/cost';
import { nextVersionNumber, canApprove, pickDnaColumns } from '@/lib/dna-versions';

// Gera uma PROPOSTA de Brand DNA (PRD §8-E6). Não ativa nada: o DNA aprovado só
// muda quando o usuário aprova (RF-04). Antes disto, cada regeneração
// sobrescrevia o brand_kits e a versão anterior sumia.
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

    const { data: versions } = await supabase
      .from('brand_dna_versions')
      .select('version')
      .eq('brand_id', brandId);

    const { data: proposal, error: insErr } = await supabase.from('brand_dna_versions').insert({
      brand_id: brandId,
      version: nextVersionNumber(versions || []),
      content: result.dna,
      report: result.report,
      sources: dnaSources,
      status: 'proposed'
    }).select('id, version, status, created_at').maybeSingle();
    if (insErr) throw new Error(`Não foi possível salvar a proposta: ${insErr.message}`);

    await supabase.from('generation_jobs').insert({
      brand_id: brandId, user_id: user.id, kind: 'brand_dna', provider: 'deepseek', model: out.model,
      input_tokens: out.usage.prompt_tokens, output_tokens: out.usage.completion_tokens,
      cost_usd: cost, status: 'success'
    }).then(() => {}, () => {});

    revalidatePath('/brand-kit');
    return { ok: true, version: proposal, dna: result.dna, report: result.report, sources: dnaSources, cost };
  } catch (e) {
    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId, user_id: user.id, kind: 'brand_dna', provider: 'deepseek', model: 'deepseek-v4-flash',
        status: 'error', error: String(e.message).slice(0, 500)
      });
    } catch {}
    return { error: e.message };
  }
}

// Aprova uma versão (proposta ou arquivada — restaurar é aprovar de novo).
// Só aqui o brand_kits muda: ele é o cache da versão ativa.
export async function approveDnaVersion({ brandId, versionId }) {
  if (!brandId || !versionId) return { error: 'Versão não informada.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { data: version } = await supabase
    .from('brand_dna_versions')
    .select('id, version, content, report, sources, status')
    .eq('id', versionId)
    .eq('brand_id', brandId)
    .maybeSingle();

  if (!version) return { error: 'Versão não encontrada.' };
  if (!canApprove(version)) return { error: 'Esta versão já está em uso.' };

  // Arquiva a aprovada atual ANTES de aprovar a nova: o banco só admite uma
  // aprovada por marca (índice único parcial), então a ordem não é opcional.
  const { error: archErr } = await supabase
    .from('brand_dna_versions')
    .update({ status: 'archived' })
    .eq('brand_id', brandId)
    .eq('status', 'approved');
  if (archErr) return { error: `Não foi possível arquivar a versão anterior: ${archErr.message}` };

  const { error: apprErr } = await supabase
    .from('brand_dna_versions')
    .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', versionId);
  if (apprErr) return { error: `Não foi possível aprovar: ${apprErr.message}` };

  // Espelha no brand_kits para os leitores atuais (prompt, autopilot, studio)
  // continuarem funcionando sem saber que existe versionamento.
  const { error: kitErr } = await supabase.from('brand_kits').upsert({
    brand_id: brandId,
    ...pickDnaColumns(version.content),
    dna_report: version.report,
    dna_sources: version.sources,
    dna_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'brand_id' });
  if (kitErr) return { error: `Aprovado, mas não foi possível ativar: ${kitErr.message}` };

  revalidatePath('/brand-kit');
  revalidatePath('/dashboard');
  return { ok: true, version: version.version };
}
