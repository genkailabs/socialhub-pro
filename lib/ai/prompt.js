// Monta o prompt on-brand p/ o DeepSeek. Puro (sem I/O), testável.
import { TEMPLATES } from '@/lib/ai/templates';

const SYSTEM = `Você é um estrategista de social media brasileiro. Gera ideias de post prontas para o Instagram.
Responda SEMPRE com um único JSON válido, sem texto fora do JSON, neste formato:
{"template":"quote|tips_carousel|promo|stat","headline":"título curto e forte","subtext":"apoio opcional","bullets":["item 1","item 2"],"caption":"legenda pronta em pt-BR (máx 2200 chars)","hashtags":["semrelevantes","semjogodemarca"],"slides":N}
Regras: português do Brasil; on-brand; não invente fatos, números ou preços; se faltar dado, escreva de forma genérica; a legenda deve ter chamada para ação. Para tips_carousel, "bullets" são as dicas (uma por slide) e "slides" = capa + dicas.`;

export function buildContentPrompt({ brandKit = {}, brief = {} } = {}) {
  const { niche, audience, tone, pillars = [], dos = [], donts = [] } = brandKit;
  const format = TEMPLATES.includes(brief.format) ? brief.format : 'quote';

  const user = [
    `Marca / nicho: ${niche || '—'}`,
    `Público-alvo: ${audience || '—'}`,
    `Tom de voz: ${tone || 'natural e próximo'}`,
    `Pilares de conteúdo: ${pillars.length ? pillars.join(', ') : '—'}`,
    `Sempre fazer: ${dos.length ? dos.join('; ') : '—'}`,
    `Nunca fazer: ${donts.length ? donts.join('; ') : '—'}`,
    '',
    `Briefing do post:`,
    `- Objetivo: ${brief.goal || 'engajar a audiência'}`,
    `- Formato: ${format}`,
    `- Tema: ${brief.topic || 'livre, dentro dos pilares'}`,
    '',
    `Gere 1 ideia de post ${format === 'tips_carousel' ? 'em carrossel de dicas' : 'única'} pronta para publicar.`
  ].join('\n');

  return { system: SYSTEM, user, format };
}
