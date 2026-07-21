import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { MAX_TITLE_CHARS, MAX_SUBTITLE_CHARS } from '@/lib/ai/art/quality';

// Skill "Story Planner" (PRD §9.10 + MVP V2): cria SEQUÊNCIAS de Stories, não
// telas soltas.
//
// Mudança do MVP V2: o Story deixou de ser roteiro de gravação. Cada card é uma
// ARTE ESTÁTICA 1080x1920, gerada pelo mesmo pipeline de Post e Carrossel
// (lib/ai/art). Então esta skill não pede mais enquadramento, cena, fala nem
// "como gravar" — ela escreve o texto que vai NA ARTE.
//
// O que sobrevive da versão 1: a sequência tem arco (abre, entrega valor,
// fecha com ação). Story avulso não constrói nada.
//
// O que saiu e por quê: enquete e caixa de perguntas são stickers interativos,
// que a Graph API não publica (limite da Meta, não do produto). Prometer um
// card de enquete que o sistema não consegue postar seria mentir para o
// usuário.

const CARD_TYPES = ['abertura', 'educativo', 'bastidores', 'prova_social', 'cta_final'];

// Curto demais não tem arco; longo demais é abandonado no meio.
const MIN_CARDS = 3;
const MAX_CARDS = 7;

// O texto do card é o título da arte, então quem manda no limite é o controle
// de qualidade da arte (§19) — não um número inventado aqui.
const MAX_CARD_TITLE = MAX_TITLE_CHARS;
const MAX_CARD_SUPPORT = MAX_SUBTITLE_CHARS;
// O que o prompt pede. Menor que o teto do schema de propósito: o teto é o que
// a arte aguenta, este é o tamanho em que o Story fica bonito.
const IDEAL_CARD_TITLE = 60;

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
  // Vira o título da arte.
  title: z.string().min(1).max(MAX_CARD_TITLE),
  // Vira o texto de apoio. Pode ser vazio: card de abertura costuma viver só do
  // título, e apoio forçado empobrece a peça.
  support: z.string().max(MAX_CARD_SUPPORT).optional().default(''),
  cta: z.string().max(120).nullable()
});

export const outputSchema = z.object({
  objective: z.string().min(1).max(200),
  cards: z.array(card).min(MIN_CARDS).max(MAX_CARDS),
  rationale: z.string().min(1).max(300)
});

const SYSTEM = [
  'Voce monta sequencias de Stories no Instagram para um pequeno negocio.',
  'Cada card e uma ARTE ESTATICA vertical: so texto sobre a identidade da marca.',
  'Nao existe video, gravacao, camera, cena, fala, enquete nem caixa de perguntas.',
  'Nunca escreva instrucao de como gravar ou fotografar: ninguem vai gravar nada.',
  'Escreva em portugues do Brasil, direto, como quem fala com o cliente.',
  `A sequencia tem de ${MIN_CARDS} a ${MAX_CARDS} cards e precisa ter arco:`,
  'abre chamando atencao, entrega algo util, fecha com uma acao clara.',
  `Tipos de card disponiveis: ${CARD_TYPES.join(', ')}.`,
  'Escolha os tipos que o tema pede — nao precisa usar todos.',
  `title e o texto grande da arte: ate ${IDEAL_CARD_TITLE} caracteres, uma ideia so.`,
  'Titulo que so se entende lendo o card anterior nao funciona: cada arte precisa',
  'fazer sentido sozinha, porque a pessoa pode entrar no meio da sequencia.',
  'support e o texto menor, que explica o titulo. Pode ser "" quando o titulo',
  'ja se basta — apoio enfeite deixa a arte pior.',
  'cta so no card que pede acao; nos outros, null.',
  'Nao prometa resultado. Nao use urgencia inventada ("ultimas vagas", "corre").',
  'Responda apenas com JSON valido no formato:',
  '{"objective":string,"cards":[{"order":number,"type":string,"title":string,',
  '"support":string,"cta":string|null}],"rationale":string}'
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

  l.push('Lembre: o sistema gera a arte de cada card e publica sozinho. Voce so escreve o texto.');

  if (input.adjustment) l.push(`Ajuste pedido pelo usuario (prioridade): ${input.adjustment}`);

  return l.join('\n');
}

export const storyPlannerSkill = defineSkill({
  id: 'story-planner',
  // v2: Story virou arte estatica. Versao sobe porque o formato da saida mudou.
  version: 2,
  description: 'Cria uma sequencia de Stories em arte estatica, com arco e fechamento.',
  inputSchema,
  outputSchema,
  temperature: 0.8,
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});

export const STORY_CARD_TYPES = CARD_TYPES;
export const STORY_CARDS = { min: MIN_CARDS, max: MAX_CARDS };
export const STORY_CARD_LIMITS = { title: MAX_CARD_TITLE, support: MAX_CARD_SUPPORT, idealTitle: IDEAL_CARD_TITLE };
