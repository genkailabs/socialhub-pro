import 'server-only';
import { ImageResponse } from 'next/og';
import { deepseekChat } from '@/lib/ai/deepseek';
import { deapiGenerateImage, hasDeapiKey, DEAPI_DEFAULT_MODEL } from '@/lib/ai/deapi';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { needsResearch, researchContext } from '@/lib/ai/research';
import { parseSpec } from '@/lib/ai/spec';
import { renderNode, slideCount } from '@/lib/ai/render';
import { resolvePalette } from '@/lib/ai/templates';
import { estimateCostUsd, deapiImageCostUsd } from '@/lib/ai/cost';
import { buildNewsImagePrompt } from '@/lib/ai/news-image';

// Monta o prompt de imagem por slide. Base = image_prompt do DeepSeek; nos
// carrosséis, injeta a dica do slide p/ variar a cena sem pedir texto na arte.
function imagePromptFor(spec, slideIndex) {
  const base = spec.imagePrompt || [spec.headline, spec.subtext].filter(Boolean).join('. ') || 'social media background';
  const bullet = spec.template === 'tips_carousel' && slideIndex > 0 ? spec.bullets?.[slideIndex - 1] : '';
  const parts = [base, bullet && `Theme of this frame: ${bullet}.`, 'No text, no letters, no watermark. Square 1:1 social media image.'];
  return parts.filter(Boolean).join(' ');
}

// Núcleo de geração (texto DeepSeek + imagem). A imagem vem da deAPI quando há
// DEAPI_API_KEY; sem a chave, cai no render on-brand via next/og (custo zero),
// permitindo testar o texto mesmo antes de configurar a deAPI.
export async function generateCreative({ supabase, brandId, brandName, brandColor, kit, brief, generateImages = true }) {
  const handle = String(brandName || 'marca').replace(/\s+/g, '').toLowerCase();
  const palette = resolvePalette({ ...(kit?.palette || {}), accent: kit?.palette?.accent || brandColor });

  // Classificador → pesquisa. Se o tema depende de info atual, o contexto vem do
  // Gemini Grounding antes do DeepSeek escrever. Falha aqui LANÇA (sem gerar) —
  // nunca cai no DeepSeek sozinho para inventar fato atual.
  const research = needsResearch(brief || {}) ? await researchContext({ supabase, brief, kit }) : null;

  const { system, user } = buildContentPrompt({ brandKit: kit || {}, brief: brief || {}, research });
  const out = await deepseekChat({ system, user });
  const spec = parseSpec(out.content);
  spec.brand = handle;

  const n = generateImages ? slideCount(spec) : 0;
  const useDeapi = hasDeapiKey();
  const imageUrls = [];
  let imageModel = null;

  for (let i = 0; i < n; i++) {
    let bytes;
    let contentType = 'image/png';
    if (useDeapi) {
      const img = await deapiGenerateImage({ prompt: imagePromptFor(spec, i) });
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
  const imageProvider = generateImages ? (useDeapi ? 'deapi' : 'render') : 'none';
  const imageCost = generateImages && useDeapi ? deapiImageCostUsd(n) : 0;

  return {
    spec,
    imageUrls,
    cost: Math.round((textCost + imageCost) * 1e6) / 1e6,
    textCost,
    imageCost,
    usage: out.usage,
    model: out.model,
    imageProvider,
    imageModel: generateImages ? (imageModel || (useDeapi ? DEAPI_DEFAULT_MODEL : null)) : null,
    imageCount: n,
    research
  };
}

function extensionFor(contentType) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/webp') return 'webp';
  return 'png';
}

export async function generateNewsImageOptions({ supabase, brandId, topic, caption, direction, basePrompt }) {
  if (!hasDeapiKey()) throw new Error('DEAPI_API_KEY não configurada no servidor.');

  const createdAt = Date.now();
  const results = await Promise.allSettled([1, 2, 3, 4].map(async (variant) => {
    const image = await deapiGenerateImage({
      prompt: buildNewsImagePrompt({ topic, caption, direction, basePrompt, variant })
    });
    const path = `${brandId}/news-${createdAt}-${variant}.${extensionFor(image.contentType)}`;
    const { error } = await supabase.storage.from('media').upload(path, image.bytes, {
      contentType: image.contentType || 'image/png',
      upsert: true
    });
    if (error) throw new Error(`Upload da imagem: ${error.message}`);
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  }));

  const imageUrls = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  if (!imageUrls.length) {
    const firstError = results.find((result) => result.status === 'rejected');
    throw firstError?.reason || new Error('Não foi possível gerar as imagens da notícia.');
  }

  return {
    imageUrls,
    imageProvider: 'deapi',
    imageModel: DEAPI_DEFAULT_MODEL,
    imageCost: deapiImageCostUsd(imageUrls.length),
    failedCount: results.length - imageUrls.length
  };
}
