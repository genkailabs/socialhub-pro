import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { IG_CAPTION_MAX } from '@/lib/posts-media';

// Skill "Produtor de Post" (PRD §9.6/§9.7/§9.8 numa execução só): transforma um
// tema aprovado em imagem única ou carrossel prontos para revisão.
//
// Uma chamada devolve hook, legenda, CTA, hashtags e slides (§11.2). Separar em
// hook -> copy -> carrossel custaria 3x e ainda perderia coerência: quem escreve
// o hook precisa saber onde a legenda vai chegar.
//
// Skills de regeneração parcial existem à parte, para quando o usuário quiser
// trocar só o hook ou só a legenda sem repagar o conteúdo inteiro.

const CAROUSEL_MIN = 3;
const CAROUSEL_MAX = 8;

export const inputSchema = z.object({
  brandName: z.string().trim().min(1),
  format: z.enum(['image', 'carousel']),
  topic: z.string().trim().min(1),
  title: z.string().trim().optional().default(''),
  objective: z.string().trim().optional().default(''),
  pillar: z.string().trim().optional().default(''),
  cta: z.string().trim().optional().default(''),
  stage: z.enum(['descoberta', 'consideracao', 'decisao']).optional().default('descoberta'),
  dna: z.object({
    tone: z.string().optional().default(''),
    audience: z.string().optional().default(''),
    personality: z.array(z.string()).optional().default([]),
    emojiUsage: z.string().optional().default(''),
    captionLength: z.string().optional().default(''),
    ctaPolicy: z.string().optional().default(''),
    donts: z.array(z.string()).optional().default([]),
    professionalRules: z.array(z.string()).optional().default([])
  }),
  // Pedido de ajuste do usuário na regeneração ("mais curto", "menos formal").
  adjustment: z.string().trim().max(300).optional().default('')
});

const slide = z.object({
  title: z.string().min(1).max(60),
  body: z.string().max(180),
  visualHint: z.string().max(160)
});

export const outputSchema = z.object({
  hook: z.string().min(1).max(120),
  caption: z.string().min(1).max(IG_CAPTION_MAX),
  cta: z.string().min(1).max(160),
  hashtags: z.array(z.string()).max(12),
  slides: z.array(slide).max(CAROUSEL_MAX),
  imagePrompt: z.string().min(1).max(600),
  altText: z.string().min(1).max(300),
  // A skill sinaliza quando o tema pede olho humano (saúde, direito, números).
  needsProfessionalReview: z.boolean(),
  reviewReason: z.string().max(200)
});

const SYSTEM = [
  'Voce escreve conteudo de Instagram para um pequeno negocio.',
  'Escreva em portugues do Brasil, na voz da marca, falando com uma pessoa — nao com "o publico".',
  'Nada de jargao de marketing e nada de promessa de resultado.',
  'O hook abre o conteudo e precisa fazer sentido sozinho; nao use clickbait,',
  'nao prometa o que a legenda nao entrega, nao use urgencia inventada.',
  'A legenda entrega o que o hook prometeu e termina no CTA.',
  'Hashtags: relevantes e especificas, sem hashtag generica de volume.',
  'imagePrompt descreve a CENA da arte, em ingles, sem pedir texto na imagem —',
  'o texto entra depois. Nunca peca logo, marca dagua ou letras.',
  'altText descreve a imagem para quem nao enxerga: o que aparece, nao o conceito.',
  'needsProfessionalReview = true quando o tema envolver saude, diagnostico,',
  'direito, dinheiro, numeros especificos ou promessa que exija respaldo.',
  'Nunca afirme que o conteudo esta em conformidade legal.',
  'Responda apenas com JSON valido no formato:',
  '{"hook":string,"caption":string,"cta":string,"hashtags":string[],',
  '"slides":[{"title":string,"body":string,"visualHint":string}],',
  '"imagePrompt":string,"altText":string,"needsProfessionalReview":boolean,',
  '"reviewReason":string}'
].join(' ');

function buildUser(input) {
  const l = [`Marca: ${input.brandName}`, `Tema: ${input.topic}`];
  const add = (k, v) => { if (v) l.push(`${k}: ${v}`); };

  add('Titulo provisorio', input.title);
  add('Objetivo deste conteudo', input.objective);
  add('Pilar', input.pillar);
  add('Chamada sugerida', input.cta);

  const momento = {
    descoberta: 'quem ainda nao conhece a marca',
    consideracao: 'quem esta avaliando',
    decisao: 'quem esta perto de contratar'
  }[input.stage];
  l.push(`Falando com: ${momento}`);

  add('Tom de voz', input.dna.tone);
  add('Publico', input.dna.audience);
  if (input.dna.personality.length) add('Personalidade da marca', input.dna.personality.join(', '));
  add('Uso de emoji', input.dna.emojiUsage);
  add('Tamanho de legenda', input.dna.captionLength);
  add('Estilo de CTA', input.dna.ctaPolicy);
  if (input.dna.donts.length) l.push(`NAO mencionar: ${input.dna.donts.join(', ')}`);
  if (input.dna.professionalRules.length) l.push(`Regras da profissao: ${input.dna.professionalRules.join('; ')}`);

  if (input.format === 'carousel') {
    l.push(`Formato: carrossel. Monte de ${CAROUSEL_MIN} a ${CAROUSEL_MAX} slides:`);
    l.push('o primeiro e a capa (usa o hook), os do meio desenvolvem uma ideia cada,');
    l.push('e o ultimo fecha com o CTA. visualHint orienta a arte de cada slide.');
  } else {
    l.push('Formato: imagem unica. Devolva slides como lista vazia.');
    l.push('Toda a mensagem vive na legenda e numa arte so.');
  }

  // Ajuste do usuário vem por último: é a instrução mais recente e deve vencer.
  if (input.adjustment) l.push(`Ajuste pedido pelo usuario (prioridade): ${input.adjustment}`);

  return l.join('\n');
}

export const postProducerSkill = defineSkill({
  id: 'post-producer',
  version: 1,
  description: 'Produz imagem unica ou carrossel a partir de um tema aprovado.',
  inputSchema,
  outputSchema,
  temperature: 0.8, // criação: mais solto que planejamento
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});

export const CAROUSEL_SLIDES = { min: CAROUSEL_MIN, max: CAROUSEL_MAX };
