import 'server-only';
import { ImageResponse } from 'next/og';
import { deepseekChat } from '@/lib/ai/deepseek';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { parseSpec } from '@/lib/ai/spec';
import { renderNode, slideCount } from '@/lib/ai/render';
import { resolvePalette } from '@/lib/ai/templates';
import { estimateCostUsd } from '@/lib/ai/cost';

// Núcleo de geração (texto DeepSeek + imagens on-brand) reaproveitado pelo
// AI Studio (client do usuário) e pelo Piloto automático (client admin/cron).
export async function generateCreative({ supabase, brandId, brandName, brandColor, kit, brief }) {
  const handle = String(brandName || 'marca').replace(/\s+/g, '').toLowerCase();
  const palette = resolvePalette({ ...(kit?.palette || {}), accent: kit?.palette?.accent || brandColor });

  const { system, user } = buildContentPrompt({ brandKit: kit || {}, brief: brief || {} });
  const out = await deepseekChat({ system, user });
  const spec = parseSpec(out.content);
  spec.brand = handle;

  const n = slideCount(spec);
  const imageUrls = [];
  for (let i = 0; i < n; i++) {
    const img = new ImageResponse(renderNode({ template: spec.template, spec, palette, slideIndex: i }), { width: 1080, height: 1080 });
    const png = Buffer.from(await img.arrayBuffer());
    const path = `${brandId}/ai-${Date.now()}-${i}.png`;
    const { error } = await supabase.storage.from('media').upload(path, png, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(`Upload da imagem: ${error.message}`);
    imageUrls.push(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
  }

  return { spec, imageUrls, cost: estimateCostUsd(out.model, out.usage), usage: out.usage, model: out.model };
}
