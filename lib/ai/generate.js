import 'server-only';
import { ImageResponse } from 'next/og';
import { deepseekChat } from '@/lib/ai/deepseek';
import { pollinationsImage, hasPollinationsKey, POLLINATIONS_IMAGE_MODEL } from '@/lib/ai/pollinations-image';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { needsResearch, researchContext } from '@/lib/ai/research';
import { parseSpec } from '@/lib/ai/spec';
import { renderNode, slideCount } from '@/lib/ai/render';
import { resolvePalette } from '@/lib/ai/templates';
import { estimateCostUsd, pollinationsImageCostUsd } from '@/lib/ai/cost';
import { buildNewsImagePrompt } from '@/lib/ai/news-image';
import { applyNewsTitleOverlay } from '@/lib/ai/news-image-render';

// Monta o prompt de imagem por slide. Base = image_prompt do DeepSeek; nos
// carrosséis, injeta a dica do slide p/ variar a cena sem pedir texto na arte.
function imagePromptFor(spec, slideIndex) {
  const base = spec.imagePrompt || [spec.headline, spec.subtext].filter(Boolean).join('. ') || 'social media background';
  const bullet = spec.template === 'tips_carousel' && slideIndex > 0 ? spec.bullets?.[slideIndex - 1] : '';
  const parts = [base, bullet && `Theme of this frame: ${bullet}.`, 'No text, no letters, no watermark. Square 1:1 social media image.'];
  return parts.filter(Boolean).join(' ');
}

function imageTitleFor(spec, slideIndex) {
  if (!spec.imageText) return '';
  if (slideIndex === 0) return spec.imageTitle || spec.headline;
  return spec.template === 'tips_carousel' ? spec.bullets?.[slideIndex - 1] || '' : '';
}

// Núcleo de geração (texto DeepSeek + imagem). A imagem vem do Pollinations
// quando há POLLINATIONS_SECRET_KEY; sem a chave, cai no render on-brand via
// next/og (custo zero), permitindo testar o texto antes de configurar a chave.
export async function generateCreative({ supabase, brandId, brandName, brandColor, kit, brief, composerContext = null, generateImages = true, maxImages = null, allowResearch = true }) {
  const handle = String(brandName || 'marca').replace(/\s+/g, '').toLowerCase();
  const palette = resolvePalette({ ...(kit?.palette || {}), accent: kit?.palette?.accent || brandColor });

  // Classificador → pesquisa. Se o tema depende de info atual, o contexto vem do
  // Gemini Grounding antes do DeepSeek escrever. Falha aqui LANÇA (sem gerar) —
  // nunca cai no DeepSeek sozinho para inventar fato atual.
  const research = allowResearch && needsResearch(brief || {}) ? await researchContext({ supabase, brief, kit }) : null;

  const { system, user } = buildContentPrompt({ brandKit: kit || {}, brief: brief || {}, research, composerContext });
  // Limite explícito evita respostas longas que não melhoram a peça final.
  const out = await deepseekChat({ system, user, maxTokens: 900 });
  const spec = parseSpec(out.content);
  spec.brand = handle;

  // O pacote do Assistente define o teto. A estrutura do conteudo pode pedir
  // mais slides, mas nunca pode gerar imagens alem do que o plano incluiu.
  const requestedImages = generateImages ? slideCount(spec) : 0;
  const n = Number.isInteger(maxImages) ? Math.max(0, Math.min(requestedImages, maxImages)) : requestedImages;
  const useAiImage = hasPollinationsKey();
  const imageUrls = [];
  let imageModel = null;

  for (let i = 0; i < n; i++) {
    let bytes;
    let contentType = 'image/png';
    if (useAiImage) {
      const img = await pollinationsImage({ prompt: imagePromptFor(spec, i) });
      bytes = img.bytes;
      imageModel = img.model;
      contentType = img.contentType || 'image/png';
      const overlayTitle = imageTitleFor(spec, i);
      if (overlayTitle) {
        const overlay = await applyNewsTitleOverlay({ source: bytes, title: overlayTitle, position: spec.imageTextPosition });
        bytes = overlay.bytes;
        contentType = overlay.contentType;
      }
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
  const imageProvider = generateImages ? (useAiImage ? 'pollinations' : 'render') : 'none';
  const imageCost = generateImages && useAiImage ? pollinationsImageCostUsd(n) : 0;

  return {
    spec,
    imageUrls,
    cost: Math.round((textCost + imageCost) * 1e6) / 1e6,
    textCost,
    imageCost,
    usage: out.usage,
    model: out.model,
    imageProvider,
    imageModel: generateImages ? (imageModel || (useAiImage ? POLLINATIONS_IMAGE_MODEL : null)) : null,
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
  if (!hasPollinationsKey()) throw new Error('POLLINATIONS_SECRET_KEY não configurada no servidor.');

  const createdAt = Date.now();
  const results = await Promise.allSettled([1, 2, 3, 4].map(async (variant) => {
    const image = await pollinationsImage({
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
  if (imageUrls.length !== 4) {
    const firstError = results.find((result) => result.status === 'rejected');
    throw new Error('Nao foi possivel gerar as quatro imagens. Tente novamente.', { cause: firstError?.reason });
  }

  return {
    imageUrls,
    imageProvider: 'pollinations',
    imageModel: POLLINATIONS_IMAGE_MODEL,
    imageCost: pollinationsImageCostUsd(imageUrls.length),
    failedCount: 0
  };
}
