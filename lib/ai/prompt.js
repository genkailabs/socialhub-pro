// Monta o prompt on-brand p/ o DeepSeek. Puro (sem I/O), testável.

const SYSTEM = `Você é um estrategista de social media brasileiro. Gera ideias de post prontas para o Instagram.
Responda SEMPRE com um único JSON válido, sem texto fora do JSON, neste formato:
{"template":"news|quote|tips_carousel|promo|stat","headline":"título curto e forte","subtext":"apoio opcional","bullets":["item 1","item 2"],"caption":"legenda pronta em pt-BR (máx 2200 chars)","hashtags":["semrelevantes","semjogodemarca"],"image_prompt":"descrição visual rica EM INGLÊS para o modelo de imagem: cena, estilo, cores, iluminação e enquadramento; sem qualquer texto/palavra na imagem","slides":N}
"template" é só o LAYOUT visual (escolha o que melhor encaixa no formato de conteúdo pedido pelo usuário) — não precisa bater com o nome do formato pedido. O formato de conteúdo em si (ex: "Parecer Simplificado", "Caso Clínico", "Antes & Depois") é livre e vem descrito no briefing; escreva o conteúdo seguindo esse formato e o tom pedidos.
Regras: português do Brasil; on-brand; não invente fatos, números ou preços; se faltar dado, escreva de forma genérica. Para conteúdo do tipo notícia, seja editorial e informativo, sem CTA comercial e sem alegar fontes, números ou datas não fornecidos. Para outros formatos, a legenda pode ter chamada para ação. Quando o layout "template" escolhido for tips_carousel, "bullets" são as dicas (uma por slide) e "slides" = capa + dicas. "image_prompt" é sempre em inglês e nunca pede texto escrito dentro da imagem.`;

// "Notícia" é o único formato com regras editoriais próprias (sem CTA, sem
// inventar fato) — detectado por texto pois o formato agora é livre.
const NEWS_FORMAT = /not[íi]cia|news/i;

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

function nicheSafetyLines(niche) {
  const value = String(niche || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const regulated = /advoca|juridic|direito|medic|saude|odonto|dent|psic/.test(value);

  if (regulated) {
    return [
      'Regra de nicho regulado: usar linguagem educativa e etica; nao prometer resultado, nao diagnosticar e nao dar aconselhamento individual.',
      'Apresente informacao geral e responsavel, sem substituir consulta, avaliacao profissional ou atendimento individual.'
    ];
  }
  if (/arquitet|interior|design/.test(value)) {
    return [
      'Regra de arquitetura: focar em processo, projeto e inspiracao visual; nao prometer resultado.',
      'Valorize decisoes de projeto, referencias e possibilidades reais sem garantir transformacoes.'
    ];
  }
  return [];
}

// Bloco de contexto atual (pesquisa Gemini Grounding). Só o resumo entra no
// prompt — as fontes ficam no log/cache, nunca no texto pedido ao DeepSeek.
function researchLines(research) {
  const summary = String(research?.summary || '').trim();
  if (!summary) return [];
  return [
    '',
    '<contexto_atual>',
    summary,
    '</contexto_atual>',
    'Use o contexto atual acima como base factual. Não afirme fatos, números ou datas que não estejam nele; não invente além do que o contexto traz.'
  ];
}

export function buildContentPrompt({ brandKit = {}, brief = {}, research = null } = {}) {
  const { niche, audience, tone: brandTone, pillars = [], dos = [], donts = [] } = brandKit;
  // Formato é texto livre (comunicação adaptativa): "Parecer Simplificado",
  // "Caso Clínico", "Antes & Depois"... — não é mais limitado aos 5 templates
  // de render, que o próprio DeepSeek escolhe à parte (campo "template" no JSON).
  const format = String(brief.format || '').trim() || 'post para redes sociais';
  const isNews = NEWS_FORMAT.test(format);
  const contentTone = String(brief.tone || '').trim();

  const user = [
    `Marca / nicho: ${niche || '—'}`,
    `Público-alvo: ${audience || '—'}`,
    `Tom de voz: ${contentTone || brandTone || 'natural e próximo'}`,
    `Pilares de conteúdo: ${pillars.length ? pillars.join(', ') : '—'}`,
    `Sempre fazer: ${dos.length ? dos.join('; ') : '—'}`,
    `Nunca fazer: ${donts.length ? donts.join('; ') : '—'}`,
    ...dnaLines(brandKit),
    ...nicheSafetyLines(niche),
    '',
    `Briefing do post:`,
    `- Objetivo: ${brief.goal || 'engajar a audiência'}`,
    `- Formato de conteúdo: ${format}`,
    `- Tema: ${brief.topic || 'livre, dentro dos pilares'}`,
    ...(isNews ? ['- Tipo: notícia informativa, factual e editorial; não inventar fatos, números, fontes ou datas; não usar chamada comercial.'] : []),
    ...researchLines(research),
    '',
    `Gere 1 ideia de post no formato "${format}" pronta para publicar.`
  ].join('\n');

  return { system: SYSTEM, user, format };
}
