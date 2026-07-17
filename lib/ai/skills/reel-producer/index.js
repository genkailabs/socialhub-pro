import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { IG_CAPTION_MAX } from '@/lib/posts-media';

// Skill "Roteirista de Reels" (PRD §9.9): roteiro que o usuário grava.
//
// O produto não gera vídeo (§5 fora de escopo) e não publica Reel nesta fase
// (§5.1). O entregável é um roteiro executável por uma pessoa com um celular —
// se depender de equipamento ou edição avançada, não serve.

const MIN_SCENES = 2;
const MAX_SCENES = 6;

export const inputSchema = z.object({
  brandName: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  objective: z.string().trim().optional().default(''),
  pillar: z.string().trim().optional().default(''),
  cta: z.string().trim().optional().default(''),
  dna: z.object({
    tone: z.string().optional().default(''),
    audience: z.string().optional().default(''),
    donts: z.array(z.string()).optional().default([]),
    professionalRules: z.array(z.string()).optional().default([])
  }),
  adjustment: z.string().trim().max(300).optional().default('')
});

const scene = z.object({
  order: z.number().int().min(1).max(MAX_SCENES),
  // O que a pessoa fala nesta cena.
  speech: z.string().min(1).max(300),
  // O que aparece escrito no vídeo.
  screenText: z.string().max(90),
  // Como filmar, sem termo técnico.
  action: z.string().min(1).max(200),
  seconds: z.number().int().min(1).max(30)
});

export const outputSchema = z.object({
  // Primeira frase falada: é o que segura ou perde o espectador.
  spokenHook: z.string().min(1).max(140),
  scenes: z.array(scene).min(MIN_SCENES).max(MAX_SCENES),
  totalSeconds: z.number().int().min(10).max(90),
  caption: z.string().min(1).max(IG_CAPTION_MAX),
  hashtags: z.array(z.string()).max(12),
  cta: z.string().min(1).max(160),
  recordingTips: z.array(z.string().max(140)).max(4),
  needsProfessionalReview: z.boolean(),
  reviewReason: z.string().max(200)
});

const SYSTEM = [
  'Voce escreve roteiros de Reels para um pequeno negocio gravar com o celular.',
  'Escreva em portugues do Brasil, do jeito que a pessoa fala — nao do jeito que se escreve.',
  'spokenHook e a primeira frase falada: precisa prender nos primeiros segundos,',
  'sem clickbait e sem prometer o que o video nao entrega.',
  `De ${MIN_SCENES} a ${MAX_SCENES} cenas, somando entre 15 e 60 segundos no total.`,
  'Cada cena tem: o que falar, o que aparece escrito, como filmar e quantos segundos.',
  'action descreve o enquadramento em linguagem simples ("de frente, na altura do',
  'peito, perto da janela"). Nada de termo de cinema, nada de equipamento.',
  'screenText e curto: cabe na tela e da tempo de ler.',
  'recordingTips sao lembretes praticos (luz, audio, roupa) — no maximo 4.',
  'Nao prometa resultado. Nao use urgencia inventada.',
  'needsProfessionalReview = true quando o tema envolver saude, diagnostico,',
  'direito, dinheiro ou numeros que exijam respaldo.',
  'Nunca afirme que o conteudo esta em conformidade legal.',
  'Responda apenas com JSON valido no formato:',
  '{"spokenHook":string,"scenes":[{"order":number,"speech":string,"screenText":string,',
  '"action":string,"seconds":number}],"totalSeconds":number,"caption":string,',
  '"hashtags":string[],"cta":string,"recordingTips":string[],',
  '"needsProfessionalReview":boolean,"reviewReason":string}'
].join(' ');

function buildUser(input) {
  const l = [`Marca: ${input.brandName}`, `Tema do Reel: ${input.topic}`];
  const add = (k, v) => { if (v) l.push(`${k}: ${v}`); };

  add('Objetivo', input.objective);
  add('Pilar', input.pillar);
  add('Chamada sugerida', input.cta);
  add('Tom de voz', input.dna.tone);
  add('Publico', input.dna.audience);
  if (input.dna.donts.length) l.push(`NAO mencionar: ${input.dna.donts.join(', ')}`);
  if (input.dna.professionalRules.length) l.push(`Regras da profissao: ${input.dna.professionalRules.join('; ')}`);

  l.push('Quem grava e a propria pessoa da marca, sozinha, com um celular na mao.');

  if (input.adjustment) l.push(`Ajuste pedido pelo usuario (prioridade): ${input.adjustment}`);

  return l.join('\n');
}

export const reelProducerSkill = defineSkill({
  id: 'reel-producer',
  version: 1,
  description: 'Cria um roteiro de Reel gravavel pelo proprio usuario.',
  inputSchema,
  outputSchema,
  temperature: 0.8,
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});

export const REEL_SCENES = { min: MIN_SCENES, max: MAX_SCENES };
