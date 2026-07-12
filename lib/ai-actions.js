'use server';
import { createClient } from '@/lib/supabase/server';
import { getBrandKit } from '@/lib/brand-kit-data';
import { generateCreative } from '@/lib/ai/generate';

// AI Studio (sob demanda): gera copy + imagens on-brand e devolve p/ o usuário
// escolher o destino (publicar/agendar/aprovar/rascunho). Não insere post aqui.
export async function generatePost({ brandId, brandName, brief }) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const kit = await getBrandKit(brandId);
  const { data: brand } = await supabase.from('brands').select('name, color').eq('id', brandId).maybeSingle();

  try {
    const gen = await generateCreative({
      supabase, brandId,
      brandName: brandName || brand?.name,
      brandColor: brand?.color,
      kit, brief
    });

    // log de custo real (best-effort — núcleo honesto)
    try {
      await supabase.from('generation_jobs').insert({
        brand_id: brandId, kind: 'post', provider: 'deepseek', model: gen.model,
        input_tokens: gen.usage.prompt_tokens || 0, output_tokens: gen.usage.completion_tokens || 0,
        cost_usd: gen.cost, status: 'success'
      });
    } catch {}

    return { ok: true, spec: gen.spec, imageUrls: gen.imageUrls, cost: gen.cost };
  } catch (e) {
    return { error: e.message };
  }
}
