import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';

// Skill "Story Planner" (PRD §9.10): cria SEQUÊNCIAS de Stories, não telas soltas.
//
// Uma sequência tem arco: abre, entrega valor, convida à interação, fecha com
// ação. Story avulso não constrói nada.
//
// Nesta fase o usuário posta manualmente (§5.1), então o resultado precisa ser
// executável por uma pessoa comum com um celular — não um roteiro de agência.

const CARD_TYPES = ['abertura', 'educativo', 'enquete', 'caixa_de_perguntas', 'bastidores', 'prova_social', 'cta_final'];
const MEDIA_TYPES = ['foto', 'video_curto', 'texto_sobre_cor'];

// Curto demais não tem arco; longo demais é abandonado no meio.
const MIN_CARDS = 3;
const MAX_CARDS = 7;

export const inputSchema = z.object({
  brandName: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  objective: z.string().trim().optional().default(''),
  pillar: z.string().trim().optional().default(''),
  cta: z.string().trim().optional().default(''),
  dna: z.object({
    tone: z.string().optional().default(''),
    audience: z.string().optional().default(''),
    emojiUsage: z.string().optional().default(''),
    donts: z.array(z.string()).optional().default([]),
    professionalRules: z.array(z.string()).optional().default([])
  }),
  adjustment: z.string().trim().max(300).optional().default('')
});

const card = z.object({
  order: z.number().int().min(1).max(MAX_CARDS),
  type: z.enum(CARD_TYPES),
  screenText: z.string().min(1).max(180),
  mediaType: z.enum(MEDIA_TYPES),
  // Como gravar/capturar, em linguagem de gente.
  captureHint: z.string().min(1).max(200),
  // Só quando for enquete ou caixa de perguntas.
  interaction: z.object({
    question: z.string().min(1).max(120),
    options: z.array(z.string().max(40)).max(4)
  }).nullable(),
  cta: z.string().max(120).nullable()
});

export const outputSchema = z.object({
  objective: z.string().min(1).max(200),
  cards: z.array(card).min(MIN_CARDS).max(MAX_CARDS),
  estimatedDuration: z.string().min(1).max(60),
  rationale: z.string().min(1).max(300)
});

const SYSTEM = [
  'Voce monta sequencias de Stories no Instagram para um pequeno negocio.',
  'Escreva em portugues do Brasil, conversando, como quem fala olhando na camera.',
  `A sequencia tem de ${MIN_CARDS} a ${MAX_CARDS} cards e precisa ter arco:`,
  'abre chamando atencao, entrega algo util, convida a interagir, fecha com uma acao clara.',
  `Tipos de card disponiveis: ${CARD_TYPES.join(', ')}.`,
  'Escolha os tipos que o tema pede — nao precisa usar todos, e nao repita',
  'enquete e caixa de perguntas na mesma sequencia.',
  'O elemento interativo precisa ter relacao direta com o tema. Enquete de',
  '"sim ou nao" sem proposito e enfeite: nao faca.',
  'interaction so existe em enquete e caixa_de_perguntas; nos outros cards, null.',
  'cta so no card que pede acao; nos outros, null.',
  `mediaType: ${MEDIA_TYPES.join(', ')}.`,
  'captureHint explica como gravar/fotografar com um celular, sem equipamento e',
  'sem termo tecnico. Quem le precisa conseguir fazer hoje, sozinho.',
  'screenText e o texto que aparece na tela: curto, legivel em poucos segundos.',
  'Nao prometa resultado. Nao use urgencia inventada ("ultimas vagas", "corre").',
  'Responda apenas com JSON valido no formato:',
  '{"objective":string,"cards":[{"order":number,"type":string,"screenText":string,',
  '"mediaType":string,"captureHint":string,"interaction":{"question":string,',
  '"options":string[]}|null,"cta":string|null}],"estimatedDuration":string,"rationale":string}'
].join(' ');

function buildUser(input) {
  const l = [`Marca: ${input.brandName}`, `Tema da sequencia: ${input.topic}`];
  const add = (k, v) => { if (v) l.push(`${k}: ${v}`); };

  add('Objetivo', input.objective);
  add('Pilar', input.pillar);
  add('Chamada sugerida', input.cta);
  add('Tom de voz', input.dna.tone);
  add('Publico', input.dna.audience);
  add('Uso de emoji', input.dna.emojiUsage);
  if (input.dna.donts.length) l.push(`NAO mencionar: ${input.dna.donts.join(', ')}`);
  if (input.dna.professionalRules.length) l.push(`Regras da profissao: ${input.dna.professionalRules.join('; ')}`);

  l.push('Lembre: quem vai gravar e postar e a propria pessoa da marca, com um celular.');

  if (input.adjustment) l.push(`Ajuste pedido pelo usuario (prioridade): ${input.adjustment}`);

  return l.join('\n');
}

export const storyPlannerSkill = defineSkill({
  id: 'story-planner',
  version: 1,
  description: 'Cria uma sequencia completa de Stories, com arco e interacao.',
  inputSchema,
  outputSchema,
  temperature: 0.8,
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});

export const STORY_CARD_TYPES = CARD_TYPES;
export const STORY_CARDS = { min: MIN_CARDS, max: MAX_CARDS };
