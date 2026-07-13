import 'server-only';
import { ImageResponse } from 'next/og';
import { geminiChat } from '@/lib/ai/gemini';
import { geminiGenerateImage, hasGeminiKey, GEMINI_IMAGE_MODEL } from '@/lib/ai/gemini-image';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { parseSpec } from '@/lib/ai/spec';
import { renderNode, slideCount } from '@/lib/ai/render';
import { resolvePalette } from '@/lib/ai/templates';
import { estimateCostUsd, geminiImageCostUsd } from '@/lib/ai/cost';

// Monta o prompt de imagem por slide. Base = image_prompt do Gemini; nos
// carrosséis, injeta a dica do slide p/ variar a cena sem pedir texto na arte.
function imagePromptFor(spec, slideIndex) {
  const base = spec.imagePrompt || [spec.headline, spec.subtext].filter(Boolean).join('. ') || 'social media background';
  const bullet = spec.template === 'tips_carousel' && slideIndex > 0 ? spec.bullets?.[slideIndex - 1] : '';
  const parts = [base, bullet && `Theme of this frame: ${bullet}.`, 'No text, no letters, no watermark. Square 1:1 social media image.'];
  return parts.filter(Boolean).join(' ');
}

// Núcleo de geração (texto + imagem via Gemini). A imagem vem do Gemini quando há
// GEMINI_API_KEY; sem a chave, cai no render on-brand via next/og (custo zero),
// permitindo testar o texto mesmo antes de configurar o Gemini.
export async function generateCreative({ supabase, brandId, brandName, brandColor, kit, brief }) {
  const handle = String(brandName || 'marca').replace(/\s+/g, '').toLowerCase();
  const palette = resolvePalette({ ...(kit?.palette || {}), accent: kit?.palette?.accent || brandColor });

  const { system, user } = buildContentPrompt({ brandKit: kit || {}, brief: brief || {} });
  const out = await geminiChat({ system, user });
  const spec = parseSpec(out.content);
  spec.brand = handle;

  const n = slideCount(spec);
  const useGemini = hasGeminiKey();
  const imageUrls = [];
  let imageModel = null;

  for (let i = 0; i < n; i++) {
    let bytes;
    let contentType = 'image/png';
    if (useGemini) {
      const img = await geminiGenerateImage({ prompt: imagePromptFor(spec, i) });
      bytes = img.bytes;
      imageModel = img.model;
      contentType = img.contentType || 'image/png';
    } else {
      const rendered = new ImageResponse(renderNode({ template: spec.template, spec, palette, slideIndex: i }), { width: 1080, height: 1080 });
      bytes = Buffer.from(await rendered.arrayBuffer());
    }
    const ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
    const path = `${brandId}/ai-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType, upsert: true });
    if (error) throw new Error(`Upload da imagem: ${error.message}`);
    imageUrls.push(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
  }

  const textCost = estimateCostUsd(out.model, out.usage);
  const imageProvider = useGemini ? 'gemini' : 'render';
  const imageCost = useGemini ? geminiImageCostUsd(n) : 0;

  return {
    spec,
    imageUrls,
    cost: Math.round((textCost + imageCost) * 1e6) / 1e6,
    textCost,
    imageCost,
    usage: out.usage,
    model: out.model,
    imageProvider,
    imageModel: imageModel || (useGemini ? GEMINI_IMAGE_MODEL : null),
    imageCount: n
  };
}
