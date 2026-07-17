import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';

// Skill "Contexto da Marca" (PRD §9.1): organiza o que se sabe do negócio numa
// estrutura estável, antes de qualquer estratégia ou conteúdo.
//
// Não inventa: o que faltar vira pergunta pendente, que a entrevista usa depois.

const texto = (max) => z.string().trim().max(max);

export const inputSchema = z.object({
  brandName: z.string().trim().min(1, 'nome da marca e obrigatorio'),
  niche: texto(300).optional().default(''),
  audience: texto(300).optional().default(''),
  objective: texto(300).optional().default(''),
  city: texto(120).optional().default(''),
  answers: z.record(z.string(), z.string()).optional().default({}),
  instagramBio: texto(500).optional().default(''),
  recentCaptions: z.array(texto(2200)).max(12).optional().default([]),
  pastedText: texto(5000).optional().default('')
});

export const outputSchema = z.object({
  summary: z.string().min(1),
  services: z.array(z.string()).max(8),
  audience: z.string(),
  objective: z.string(),
  differentiators: z.array(z.string()).max(6),
  restrictions: z.array(z.string()).max(6),
  pendingQuestions: z.array(z.string()).max(5),
  confidence: z.enum(['baixa', 'media', 'alta'])
});

const SYSTEM = [
  'Voce organiza informacoes de um negocio para uso em redes sociais.',
  'Escreva em portugues do Brasil, linguagem simples, sem jargao de marketing.',
  'Use SOMENTE o que foi informado. Nao invente servicos, numeros ou diferenciais.',
  'O que faltar deve virar uma pergunta em pendingQuestions, nao um palpite.',
  'confidence: "baixa" se houver pouca informacao alem do cadastro; "alta" apenas',
  'quando houver entrevista e sinais do Instagram.',
  'Responda apenas com JSON valido no formato:',
  '{"summary":string,"services":string[],"audience":string,"objective":string,',
  '"differentiators":string[],"restrictions":string[],"pendingQuestions":string[],',
  '"confidence":"baixa"|"media"|"alta"}'
].join(' ');

// Só entra no prompt o que existe: campo vazio vira ausência explícita, para o
// modelo tratar como pendência em vez de preencher sozinho.
function buildUser(input) {
  const parts = [`Marca: ${input.brandName}`];
  const add = (label, value) => { if (value) parts.push(`${label}: ${value}`); };

  add('Area de atuacao', input.niche);
  add('Publico informado', input.audience);
  add('Objetivo informado', input.objective);
  add('Cidade/regiao', input.city);
  add('Bio do Instagram', input.instagramBio);
  add('Texto fornecido pelo usuario', input.pastedText);

  const answers = Object.entries(input.answers).filter(([, v]) => v?.trim());
  if (answers.length) {
    parts.push('Respostas da entrevista:');
    for (const [q, a] of answers) parts.push(`- ${q}: ${a}`);
  }

  if (input.recentCaptions.length) {
    parts.push('Legendas recentes (amostra do que a marca ja publica):');
    for (const c of input.recentCaptions) parts.push(`- ${c.slice(0, 300)}`);
  }

  const missing = [
    !input.niche && 'area de atuacao',
    !input.audience && 'publico',
    !input.objective && 'objetivo',
    !input.instagramBio && !input.recentCaptions.length && 'dados do Instagram'
  ].filter(Boolean);
  if (missing.length) parts.push(`Nao informado: ${missing.join(', ')}.`);

  return parts.join('\n');
}

export const brandContextSkill = defineSkill({
  id: 'brand-context',
  version: 1,
  description: 'Organiza as informacoes do negocio e aponta o que ainda falta saber.',
  inputSchema,
  outputSchema,
  temperature: 0.4, // organizar, não criar
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});
