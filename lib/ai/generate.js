import 'server-only';
import { ImageResponse } from 'next/og';
import { deepseekChat } from '@/lib/ai/deepseek';
import { pollinationsImage, hasPollinationsKey, POLLINATIONS_IMAGE_MODEL } from '@/lib/ai/pollinations-image';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { needsResearch, researchContext } from '@/lib/ai/research';
import { parseSpec } from '@/lib/ai/spec';
import { slideCount } from '@/lib/ai/render';
import { buildArt } from '@/lib/ai/art/pipeline';
import { artFonts } from '@/lib/ai/art/fonts';
import { estimateCostUsd, pollinationsImageCostUsd } from '@/lib/ai/cost';
import { buildNewsImagePrompt } from '@/lib/ai/news-image';

async function generateTextSpec({ system, user }) {
  const first = await deepseekChat({ system, user, maxTokens: 1600 });
  try {
    return { out: first, spec: parseSpec(first.content) };
  } catch (error) {
    const retry = await deepseekChat({
      system,
      user: [
        user,
        '',
        'A resposta anterior nao veio como JSON valido.',
        'Responda novamente somente com um unico objeto JSON valido, sem markdown, sem comentarios e sem texto antes ou depois.'
      ].join('\n'),
      temperature: 0.2,
      maxTokens: 1800
    });
    try {
      return { out: retry, spec: parseSpec(retry.content) };
    } catch {
      throw error;
    }
  }
}

// Monta o prompt de imagem por slide. Base = image_prompt do DeepSeek; nos
// carrosséis, injeta a dica do slide p/ variar a cena sem pedir texto na arte.
function imagePromptFor(spec, slideIndex) {
  const base = spec.imagePrompt || [spec.headline, spec.subtext].filter(Boolean).join('. ') || 'social media background';
  const bullet = spec.template === 'tips_carousel' && slideIndex > 0 ? spec.bullets?.[slideIndex - 1] : '';
  const parts = [base, bullet && `Theme of this frame: ${bullet}.`, 'No text, no letters, no watermark. Square 1:1 social media image.'];
  return parts.filter(Boolean).join(' ');
}

// Traduz a spec da IA para o conteúdo que o compositor entende (§13).
// Num carrossel, a capa carrega o tema e cada slide seguinte carrega uma dica.
function artContentFor(spec, slideIndex, handle, imageUrl) {
  const ehCarrossel = spec.template === 'tips_carousel';
  const capa = slideIndex === 0;
  const dica = ehCarrossel && !capa ? spec.bullets?.[slideIndex - 1] || '' : '';

  return {
    title: dica || spec.imageTitle || spec.headline || '',
    subtitle: capa ? spec.subtext || '' : '',
    // Só a capa mostra a lista: repetir os itens em cada slide polui a peça.
    bullets: capa && !ehCarrossel ? spec.bullets || [] : [],
    eyebrow: ehCarrossel && !capa ? `DICA ${slideIndex}` : '',
    cta: capa ? spec.cta || '' : '',
    brand: handle,
    imageUrl: imageUrl || null
  };
}

// Núcleo de geração (texto DeepSeek + imagem). A imagem vem do Pollinations
// quando há POLLINATIONS_SECRET_KEY; sem a chave, cai no render on-brand via
// next/og (custo zero), permitindo testar o texto antes de configurar a chave.
export async function generateCreative({ supabase, brandId, brandName, brandColor, kit, brief, composerContext = null, generateImages = true, maxImages = null, allowResearch = true }) {
  const handle = String(brandName || 'marca').replace(/\s+/g, '').toLowerCase();

  // Classificador → pesquisa. Se o tema depende de info atual, o contexto vem do
  // Gemini Grounding antes do DeepSeek escrever. Falha aqui LANÇA (sem gerar) —
  // nunca cai no DeepSeek sozinho para inventar fato atual.
  const research = allowResearch && needsResearch(brief || {}) ? await researchContext({ supabase, brief, kit }) : null;

  const { system, user } = buildContentPrompt({ brandKit: kit || {}, brief: brief || {}, research, composerContext });
  // Limite folgado evita JSON cortado no meio quando a legenda ou o prompt visual sao maiores.
  const { out, spec } = await generateTextSpec({ system, user });
  spec.brand = handle;

  // O pacote do Assistente define o teto. A estrutura do conteudo pode pedir
  // mais slides, mas nunca pode gerar imagens alem do que o plano incluiu.
  const requestedImages = generateImages ? slideCount(spec) : 0;
  const n = Number.isInteger(maxImages) ? Math.max(0, Math.min(requestedImages, maxImages)) : requestedImages;
  const useAiImage = hasPollinationsKey();
  const imageUrls = [];
  let imageModel = null;

  // §15: a variação de layout é por marca, então a capa e os slides seguintes
  // não repetem a mesma composição dentro do próprio carrossel.
  const recentLayouts = [];
  const artIssues = [];

  for (let i = 0; i < n; i++) {
    let contentType = 'image/png';
    let imageForArt = null;

    if (useAiImage) {
      const img = await pollinationsImage({ prompt: imagePromptFor(spec, i) });
      imageModel = img.model;
      // A imagem entra na composição como data URI: assim o layout usa a foto
      // de verdade (§13) em vez de só receber um título por cima dela.
      imageForArt = `data:${img.contentType || 'image/png'};base64,${Buffer.from(img.bytes).toString('base64')}`;
    }

    // §19: o pipeline valida e corrige antes de entregar. Só o que passa (ou o
    // que não tem conserto automático) chega ao rasterizador.
    const art = buildArt({
      content: artContentFor(spec, i, handle, imageForArt),
      kit,
      brandColor,
      niche: kit?.niche || kit?.segment || brief?.niche || '',
      size: 'square',
      recentLayouts,
      seed: i
    });
    recentLayouts.unshift(art.layout.id);
    if (!art.ok) artIssues.push({ slide: i, report: art.report });

    const rendered = new ImageResponse(art.node, { width: art.size.width, height: art.size.height, fonts: artFonts() });
    const bytes = Buffer.from(await rendered.arrayBuffer());
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
    research,
    // §19: se alguma arte não passou no checklist e não tinha conserto
    // automático, isso sobe junto. Entregar sem avisar seria esconder do
    // usuário que a peça saiu abaixo do padrão.
    artIssues
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
