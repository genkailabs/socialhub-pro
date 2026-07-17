import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';
import { formatIds, formatMenu } from '@/lib/formats';

// Skill "Estrategista de Conteudo" (PRD §9.4 / Etapa 8): define POR QUE a marca
// vai publicar, antes de qualquer post existir. Sem esta etapa o produto volta a
// ser um gerador de legenda avulsa.

export const inputSchema = z.object({
  brandName: z.string().trim().min(1),
  dna: z.object({
    niche: z.string().optional().default(''),
    audience: z.string().optional().default(''),
    tone: z.string().optional().default(''),
    pillars: z.array(z.string()).optional().default([]),
    objective: z.string().optional().default(''),
    donts: z.array(z.string()).optional().default([])
  }),
  // Vem do diagnostico quando existir: a estrategia deve responder ao perfil
  // real, nao a um perfil imaginado.
  auditPriorities: z.array(z.string()).max(3).optional().default([]),
  postsPerWeek: z.number().int().min(1).max(21).optional().default(3),
  periodLabel: z.string().optional().default('proximo mes')
});

const pilar = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  share: z.number().int().min(0).max(100),
  examples: z.array(z.string()).max(3)
});

export const outputSchema = z.object({
  mainObjective: z.string().min(1),
  secondaryObjectives: z.array(z.string()).max(3),
  targetAudience: z.string().min(1),
  editorialProposal: z.string().min(1),
  pillars: z.array(pilar).min(2).max(5),
  // Formatos do registro: a estrategia recomenda o que o produto sabe planejar.
  formats: z.array(z.enum(formatIds())).max(4),
  postsPerWeek: z.number().int().min(1).max(21),
  balance: z.object({
    educacao: z.number().int().min(0).max(100),
    autoridade: z.number().int().min(0).max(100),
    relacionamento: z.number().int().min(0).max(100),
    conversao: z.number().int().min(0).max(100)
  }),
  professionalRules: z.array(z.string()).max(5),
  indicators: z.array(z.string()).max(4),
  rationale: z.string().min(1)
});

const SYSTEM = [
  'Voce monta a estrategia de conteudo de um pequeno negocio no Instagram.',
  'Escreva em portugues do Brasil, simples, como quem explica para alguem que',
  'nunca estudou marketing. Nada de "topo de funil", "arquetipo" ou "lead magnet".',
  'Se precisar de um termo tecnico, explique em seguida com palavras comuns.',
  'Use SOMENTE o que foi informado sobre a marca. Nao invente servico nem numero.',
  'Os pilares devem somar 100 em share. O balance tambem deve somar 100.',
  `Formatos disponiveis: ${formatMenu()}.`,
  'Em formats, use exatamente estes identificadores. Recomende a combinacao que',
  'serve ao objetivo — presenca constante costuma pedir Stories; alcance pede Reels.',
  'Se a profissao for regulada (saude, direito, financas), inclua as regras em',
  'professionalRules — sem afirmar que isso garante conformidade legal.',
  'Responda apenas com JSON valido no formato:',
  '{"mainObjective":string,"secondaryObjectives":string[],"targetAudience":string,',
  '"editorialProposal":string,"pillars":[{"name":string,"description":string,',
  '"share":number,"examples":string[]}],"formats":string[],"postsPerWeek":number,',
  '"balance":{"educacao":number,"autoridade":number,"relacionamento":number,"conversao":number},',
  '"professionalRules":string[],"indicators":string[],"rationale":string}'
].join(' ');

function buildUser(input) {
  const linhas = [`Marca: ${input.brandName}`, `Periodo: ${input.periodLabel}`];
  const add = (label, value) => { if (value) linhas.push(`${label}: ${value}`); };

  add('Area de atuacao', input.dna.niche);
  add('Publico', input.dna.audience);
  add('Tom de voz', input.dna.tone);
  add('Objetivo do negocio', input.dna.objective);
  if (input.dna.pillars.length) add('Pilares atuais', input.dna.pillars.join(', '));
  if (input.dna.donts.length) add('Assuntos proibidos', input.dna.donts.join(', '));

  linhas.push(`Frequencia possivel: ${input.postsPerWeek} posts por semana`);

  if (input.auditPriorities.length) {
    linhas.push('Prioridades vindas do diagnostico do perfil:');
    for (const p of input.auditPriorities) linhas.push(`- ${p}`);
  } else {
    linhas.push('Ainda nao ha diagnostico do perfil: baseie-se no que foi informado.');
  }

  return linhas.join('\n');
}

export const contentStrategySkill = defineSkill({
  id: 'content-strategy',
  version: 1,
  description: 'Define objetivo, pilares, formatos e frequencia do ciclo.',
  inputSchema,
  outputSchema,
  temperature: 0.6,
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});
