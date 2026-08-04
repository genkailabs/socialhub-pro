import 'server-only';
import { ImageResponse } from 'next/og';
import { openrouterChat } from '@/lib/ai/openrouter';
import { pollinationsImage, hasPollinationsKey, POLLINATIONS_IMAGE_MODEL } from '@/lib/ai/pollinations-image';
import { buildContentPrompt } from '@/lib/ai/prompt';
import { needsResearch, researchContext } from '@/lib/ai/research';
import { parseSpec } from '@/lib/ai/spec';
import { slideCount } from '@/lib/ai/render';
import { buildArt } from '@/lib/ai/art/pipeline';
import { artFonts } from '@/lib/ai/art/fonts';
import { estimateCostUsd, pollinationsImageCostUsd } from '@/lib/ai/cost';

async function generateTextSpec({ system, user }) {
  const first = await openrouterChat({ system, user, maxTokens: 1600 });
  try {
    return { out: first, spec: parseSpec(first.content) };
  } catch (error) {
    // finish_reason "length" = a resposta foi cortada no teto de tokens, não veio
    // malformada. Repetir com o mesmo teto (ou quase) reproduz o mesmo corte;
    // o retry precisa de bem mais espaço, não de outro pedido de formatação.
    const wasTruncated = first.finishReason === 'length';
    const retry = await openrouterChat({
      system,
      user: wasTruncated
        ? user
        : [
          user,
          '',
          'A resposta anterior nao veio como JSON valido.',
          'Responda novamente somente com um unico objeto JSON valido, sem markdown, sem comentarios e sem texto antes ou depois.'
        ].join('\n'),
      temperature: wasTruncated ? 0.9 : 0.2,
      maxTokens: wasTruncated ? 3200 : 1800
    });
    try {
      return { out: retry, spec: parseSpec(retry.content) };
    } catch {
      // §8: a mensagem que sobe é a técnica, e ela nunca chega à superfície —
      // a interface troca pelo texto amigável e guarda estes campos no bloco
      // "ver detalhes técnicos". Sem eles o suporte fica sem nada para ler.
      error.detail = [
        error.reason === 'schema' ? 'schema fora do formato esperado' : 'resposta não é JSON',
        wasTruncated ? 'resposta truncada no teto de tokens' : null,
        `1ª tentativa: ${first.finishReason || 'sem finish_reason'}, ${first.usage?.completion_tokens ?? '?'} tokens`,
        `2ª tentativa: ${retry.finishReason || 'sem finish_reason'}, ${retry.usage?.completion_tokens ?? '?'} tokens`
      ].filter(Boolean).join(' · ');
      throw error;
    }
  }
}

// Monta o prompt de imagem por slide. Base = image_prompt da IA de texto; nos
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

// Núcleo de geração (texto via OpenRouter + imagem). A imagem vem do Pollinations
// quando há POLLINATIONS_SECRET_KEY; sem a chave, cai no render on-brand via
// next/og (custo zero), permitindo testar o texto antes de configurar a chave.
export async function generateCreative({ supabase, brandId, brandName, brandColor, kit, brief, composerContext = null, generateImages = true, maxImages = null, allowResearch = true, verifiedResearch = null, mediaNamespace = null }) {
  const handle = String(brandName || 'marca').replace(/\s+/g, '').toLowerCase();

  // Classificador → pesquisa. Se o tema depende de info atual, o contexto vem do
  // Gemini Grounding antes da IA de texto escrever. Falha aqui LANÇA (sem gerar) —
  // nunca cai só na IA de texto para inventar fato atual.
  const research = verifiedResearch || (allowResearch && needsResearch(brief || {}) ? await researchContext({ supabase, brief, kit }) : null);

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
  const uploadedPaths = [];
  const mediaBucket = supabase.storage?.from('media');
  const namespace = mediaNamespace == null || mediaNamespace === '' ? '' : String(mediaNamespace);
  if (namespace && !/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i.test(namespace)) {
    throw new Error('Namespace de mídia inválido.');
  }
  const mediaPrefix = namespace ? `${brandId}/${namespace}` : String(brandId);
  let imageModel = null;

  // §15: a variação de layout é por marca, então a capa e os slides seguintes
  // não repetem a mesma composição dentro do próprio carrossel.
  const recentLayouts = [];
  const artIssues = [];

  try {
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
      const path = `${mediaPrefix}/ai-${Date.now()}-${i}.${ext}`;
      const { error } = await mediaBucket.upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(`Upload da imagem: ${error.message}`);
      uploadedPaths.push(path);
      imageUrls.push(mediaBucket.getPublicUrl(path).data.publicUrl);
    }
  } catch (error) {
    if (uploadedPaths.length) {
      let cleanupFailed = false;
      try {
        const cleanup = await mediaBucket.remove(uploadedPaths);
        cleanupFailed = Boolean(cleanup?.error);
      } catch {
        cleanupFailed = true;
      }
      if (cleanupFailed) {
        error.cleanupPendingPaths = [...uploadedPaths];
        error.cleanupError = 'Não foi possível remover as mídias geradas.';
      }
    }
    throw error;
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
    storagePaths: uploadedPaths,
    research,
    // §19: se alguma arte não passou no checklist e não tinha conserto
    // automático, isso sobe junto. Entregar sem avisar seria esconder do
    // usuário que a peça saiu abaixo do padrão.
    artIssues
  };
}
