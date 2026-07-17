// Monta o prompt on-brand p/ o DeepSeek. Puro (sem I/O), testável.
import { TEMPLATES } from '@/lib/ai/templates';

const SYSTEM = `Você é um estrategista de social media brasileiro. Gera ideias de post prontas para o Instagram.
Responda SEMPRE com um único JSON válido, sem texto fora do JSON, neste formato:
{"template":"news|quote|tips_carousel|promo|stat","headline":"título curto e forte","subtext":"apoio opcional","bullets":["item 1","item 2"],"caption":"legenda pronta em pt-BR (máx 2200 chars)","hashtags":["semrelevantes","semjogodemarca"],"image_prompt":"descrição visual rica EM INGLÊS para o modelo de imagem: cena, estilo, cores, iluminação e enquadramento; sem qualquer texto/palavra na imagem","slides":N}
Regras: português do Brasil; on-brand; não invente fatos, números ou preços; se faltar dado, escreva de forma genérica. Para news, faça uma notícia editorial e informativa, sem CTA comercial e sem alegar fontes, números ou datas não fornecidos. Para outros formatos, a legenda pode ter chamada para ação. Para tips_carousel, "bullets" são as dicas (uma por slide) e "slides" = capa + dicas. "image_prompt" é sempre em inglês e nunca pede texto escrito dentro da imagem.`;

// Traduz campos do Brand DNA em instruções claras p/ o modelo. Só emite a linha
// quando o campo existe (marca sem DNA gera prompt enxuto, como antes).
function dnaLines(kit) {
  const {
    personality = [], emotions = [], formality, emoji_usage, cta_policy,
    storytelling, visual_style, caption_length
  } = kit;
  const lines = [];
  if (personality.length) lines.push(`Personalidade da marca: ${personality.join(', ')}.`);
  if (emotions.length) lines.push(`Emoções a evocar: ${emotions.join(', ')}.`);
  if (formality) lines.push(`Formalidade: ${formality}.`);
  if (emoji_usage) {
    const map = { nunca: 'Não usar emojis.', poucos: 'Usar poucos emojis, com parcimônia.', muitos: 'Usar emojis com generosidade.' };
    lines.push(`Emojis: ${map[emoji_usage] || emoji_usage}`);
  }
  if (cta_policy) {
    const map = { sempre: 'Sempre incluir chamada para ação (CTA).', 'só vendas': 'Incluir CTA apenas em posts de venda.', nunca: 'Não incluir chamada para ação.' };
    lines.push(map[cta_policy] || `CTA: ${cta_policy}.`);
  }
  if (typeof storytelling === 'boolean') lines.push(storytelling ? 'Usar storytelling na legenda.' : 'Evitar storytelling; ser direto.');
  if (visual_style) lines.push(`Estilo visual (para o image_prompt): ${visual_style}.`);
  if (caption_length) lines.push(`Tamanho da legenda: ${caption_length}.`);
  return lines;
}

export function buildContentPrompt({ brandKit = {}, brief = {} } = {}) {
  const { niche, audience, tone, pillars = [], dos = [], donts = [] } = brandKit;
  const format = TEMPLATES.includes(brief.format) ? brief.format : 'news';
  const isNews = format === 'news';

  const user = [
    `Marca / nicho: ${niche || '—'}`,
    `Público-alvo: ${audience || '—'}`,
    `Tom de voz: ${tone || 'natural e próximo'}`,
    `Pilares de conteúdo: ${pillars.length ? pillars.join(', ') : '—'}`,
    `Sempre fazer: ${dos.length ? dos.join('; ') : '—'}`,
    `Nunca fazer: ${donts.length ? donts.join('; ') : '—'}`,
    ...dnaLines(brandKit),
    '',
    `Briefing do post:`,
    `- Objetivo: ${brief.goal || 'engajar a audiência'}`,
    `- Formato: ${format}`,
    `- Tema: ${brief.topic || 'livre, dentro dos pilares'}`,
    ...(isNews ? ['- Tipo: notícia informativa, factual e editorial; não inventar fatos, números, fontes ou datas; não usar chamada comercial.'] : []),
    '',
    `Gere 1 ideia de ${isNews ? 'notícia informativa editorial' : format === 'tips_carousel' ? 'post em carrossel de dicas' : 'post único'} pronta para publicar.`
  ].join('\n');

  return { system: SYSTEM, user, format };
}
