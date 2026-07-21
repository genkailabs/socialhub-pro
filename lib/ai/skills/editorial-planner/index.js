import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { plannableFormatIds, formatMenu } from '@/lib/formats';

// Skill "Planejador Editorial" (PRD §9.5 / Etapa 9): transforma a estrategia em
// temas concretos da semana.
//
// Regra de economia (§8-E9): AQUI NAO SE GERA CONTEUDO. Nada de legenda, slide
// ou imagem. Planejar e barato; produzir e caro — e so o tema aprovado merece
// virar conteudo (RF-07). Por isso o outputSchema nem tem campo de legenda: o
// executor rejeitaria, mas o schema deixa a regra explicita.

export const inputSchema = z.object({
  brandName: z.string().trim().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart deve ser YYYY-MM-DD'),
  strategy: z.object({
    mainObjective: z.string(),
    pillars: z.array(z.object({ name: z.string(), share: z.number() })).min(1),
    formats: z.array(z.string()).default([]),
    postsPerWeek: z.number().int().min(1).max(21)
  }),
  tone: z.string().optional().default(''),
  donts: z.array(z.string()).optional().default([]),
  // Sinais de aprovacao/rejeicao entram como contexto (§8-E16), nunca como regra
  // automatica: aprender nao pode virar a IA decidindo sozinha.
  signals: z.array(z.string()).max(5).optional().default([]),
  // Evita repetir o que a marca acabou de publicar.
  recentTopics: z.array(z.string()).max(10).optional().default([]),
  postingSlots: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    label: z.string()
  })).max(7).optional().default([]),
  hasMetricSignal: z.boolean().optional().default(false),
  // MVP V2 §1/§4: a janela e movel (7 dias a partir de hoje) e os dias que ja
  // tem conteudo decidido nao entram. A IA so pode usar estas datas.
  availableDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(7).optional().default([]),
  windowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const item = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  suggestedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  // Só formatos planejáveis: string livre deixaria a IA inventar "carrossel de
  // vídeo" e o item morreria depois, na produção. Reel sai do MVP (§12).
  format: z.enum(plannableFormatIds()),
  topic: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  pillar: z.string().min(1),
  stage: z.enum(['descoberta', 'consideracao', 'decisao']),
  summary: z.string().min(1),
  hook: z.string().min(1),
  cta: z.string().min(1),
  targetAudience: z.string().min(1),
  estimatedDuration: z.string().min(1),
  rationale: z.string().min(1)
});

export const outputSchema = z.object({
  weeklySummary: z.object({
    mainFocus: z.string().min(1),
    description: z.string().min(1)
  }),
  items: z.array(item).min(1).max(21)
});

const SYSTEM = [
  'Voce planeja os proximos 7 dias de conteudo de um pequeno negocio no Instagram.',
  'A janela e movel e comeca HOJE: nao planeje "semana fechada" comecando na segunda.',
  'Use exclusivamente as datas disponiveis informadas, uma por item, sem repetir data.',
  'Escreva em portugues do Brasil, simples, sem jargao de marketing.',
  'Planeje APENAS os temas: nao escreva legenda, roteiro, slide nem hashtag.',
  'O titulo e provisorio, so para a pessoa reconhecer a ideia.',
  'Para cada tema, escreva um resumo curto, um gancho, o publico principal e a duracao estimada.',
  'Para cada tema, escolha suggestedTime em HH:MM no horario de Sao Paulo.',
  'Use os melhores horarios informados quando existirem; se forem horarios iniciais, trate como sugestao prudente, nao como dado medido.',
  'Se duracao nao se aplicar ao formato, escreva "Nao se aplica".',
  'Cada item precisa de uma justificativa curta ligada ao objetivo ou ao pilar.',
  'Distribua os pilares conforme o peso de cada um e respeite a frequencia pedida.',
  'Nao repita tema recente. Nao toque em assunto proibido.',
  'stage indica o momento da audiencia: "descoberta" para quem ainda nao conhece,',
  '"consideracao" para quem esta avaliando, "decisao" para quem esta perto de contratar.',
  // §5.1: a semana precisa parecer uma semana real de Instagram.
  `Formatos disponiveis: ${formatMenu()}.`,
  'Use format exatamente com um destes identificadores.',
  'Varie os formatos: uma marca nao vive so de post no feed. Stories sustentam',
  'presenca e conversa; carrossel ensina passo a passo; imagem fixa uma ideia.',
  'Escolha o formato pelo que o tema pede.',
  'Responda apenas com JSON valido no formato:',
  '{"weeklySummary":{"mainFocus":string,"description":string},"items":[{"date":"YYYY-MM-DD","format":string,"topic":string,"title":string,',
  '"suggestedTime":"HH:MM",',
  '"objective":string,"pillar":string,"stage":"descoberta"|"consideracao"|"decisao",',
  '"summary":string,"hook":string,"cta":string,"targetAudience":string,"estimatedDuration":string,"rationale":string}]}'
].join(' ');

// Quantos temas cabem de verdade. A frequencia da estrategia vai ate 21 por
// semana, mas a janela e de 7 dias e vale no maximo um item por data (§4):
// pedir 14 temas com 7 datas disponiveis e um pedido impossivel, e o modelo
// respondia com uma lista que nao cabia no teto de tokens.
export function plannableCount(input) {
  const pedido = input.strategy.postsPerWeek;
  const datas = input.availableDates?.length || 0;
  return datas ? Math.min(pedido, datas) : pedido;
}

function buildUser(input) {
  const linhas = [
    `Marca: ${input.brandName}`,
    `Janela de planejamento comeca em (hoje): ${input.windowStart || input.weekStart}`,
    `Objetivo do ciclo: ${input.strategy.mainObjective}`,
    `Quantidade de temas a planejar: ${plannableCount(input)} (exatamente esse numero, nem mais nem menos)`,
    `Pilares e peso: ${input.strategy.pillars.map((p) => `${p.name} (${p.share}%)`).join(', ')}`
  ];

  // §4: a lista ja vem sem os dias ocupados. Um dia por item, no maximo.
  if (input.availableDates.length) {
    linhas.push(`Datas disponiveis (use SOMENTE estas, no maximo um item por data): ${input.availableDates.join(', ')}`);
  }

  if (input.strategy.formats.length) linhas.push(`Formatos recomendados: ${input.strategy.formats.join(', ')}`);
  if (input.tone) linhas.push(`Tom de voz: ${input.tone}`);
  if (input.donts.length) linhas.push(`Assuntos proibidos: ${input.donts.join(', ')}`);
  if (input.recentTopics.length) linhas.push(`Temas recentes (nao repetir): ${input.recentTopics.join('; ')}`);
  if (input.postingSlots.length) {
    linhas.push(`Horarios recomendados para postar: ${input.postingSlots.map((slot) => slot.label).join('; ')}`);
    linhas.push(input.hasMetricSignal
      ? 'Estes horarios vieram de metricas do perfil/canal. Priorize dias e horarios compativeis.'
      : 'Ainda nao ha sinal confiavel de metricas. Use estes horarios como ponto de partida e varie a semana.');
  }

  if (input.signals.length) {
    linhas.push('O que ja se aprendeu com as escolhas do usuario (considere, mas nao trate como regra):');
    for (const s of input.signals) linhas.push(`- ${s}`);
  }

  linhas.push('Lembre: apenas o planejamento dos temas. Nada de legenda ou imagem.');
  return linhas.join('\n');
}

export const editorialPlannerSkill = defineSkill({
  id: 'editorial-planner',
  // v5 (MVP V2): janela movel de 7 dias a partir de hoje, datas disponiveis
  // vindas de fora e escopo sem video (§1/§4/§12). Prompt e schema mudaram,
  // entao a versao sobe — senao o custo e a qualidade das duas se misturam.
  version: 5,
  description: 'Transforma a estrategia em temas dos proximos 7 dias (post, carrossel e stories), sem produzir conteudo.',
  inputSchema,
  outputSchema,
  temperature: 0.7,
  // Cada tema traz treze campos de texto livre, entao a semana inteira passa
  // longe do teto padrao de 1.200 tokens. Com 4096 o JSON ainda vinha cortado
  // em producao (output_tokens batendo exatamente no limite, nas duas
  // tentativas) e o erro chegava ao usuario como "resposta nao era JSON".
  maxTokens: 8000,
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});
