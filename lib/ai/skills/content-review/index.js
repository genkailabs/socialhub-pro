import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';

// Skill "Revisor" (PRD §9.12 + §9.13 numa execução): confere se o conteúdo
// respeita a marca E se há risco antes de publicar (Etapa 11).
//
// Marca e segurança numa chamada só porque olham o mesmo texto ao mesmo tempo:
// separar dobraria o custo por conteúdo sem separar decisão nenhuma — a saída
// seria combinada de qualquer jeito.
//
// Regra do produto: NUNCA afirmar conformidade legal. O produto sinaliza risco e
// pede olho humano; ele não é advogado nem conselho profissional (§8-E11).

export const inputSchema = z.object({
  brandName: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  // O que será revisado, já montado.
  content: z.object({
    hook: z.string().optional().default(''),
    caption: z.string().optional().default(''),
    cta: z.string().optional().default(''),
    hashtags: z.array(z.string()).optional().default([]),
    slides: z.array(z.string()).optional().default([])
  }),
  dna: z.object({
    tone: z.string().optional().default(''),
    audience: z.string().optional().default(''),
    personality: z.array(z.string()).optional().default([]),
    donts: z.array(z.string()).optional().default([]),
    professionalRules: z.array(z.string()).optional().default([])
  }),
  // Legendas recentes: repetir o que acabou de sair cansa a audiência.
  recentCaptions: z.array(z.string().max(400)).max(5).optional().default([])
});

const problema = z.object({
  // Trecho exato, para o usuário achar na tela.
  excerpt: z.string().max(200),
  issue: z.string().min(1).max(200),
  suggestion: z.string().min(1).max(240)
});

export const outputSchema = z.object({
  // aprovado / atencao / bloqueado (§8-E11)
  decision: z.enum(['aprovado', 'atencao', 'bloqueado']),
  brandFit: z.object({
    score: z.number().int().min(0).max(10),
    notes: z.string().max(300)
  }),
  problems: z.array(problema).max(6),
  // Motivos pelos quais uma pessoa deveria olhar antes de publicar.
  professionalReviewReasons: z.array(z.string().max(160)).max(4),
  summary: z.string().min(1).max(300)
});

const SYSTEM = [
  'Voce revisa um conteudo de Instagram antes de ele ir ao ar.',
  'Escreva em portugues do Brasil, direto, sem jargao.',
  'Verifique: aderencia ao tom e as regras da marca; coerencia com o tema;',
  'repeticao do que ja foi publicado; promessa exagerada; linguagem proibida;',
  'dado que parece inventado; exposicao de informacao pessoal; conteudo sensivel;',
  'presenca de CTA; tamanho da legenda.',
  'decision: "aprovado" quando pode publicar; "atencao" quando da para publicar',
  'mas convem ajustar; "bloqueado" quando publicar seria um erro.',
  'Cada problema precisa citar o trecho exato e sugerir a correcao.',
  'Se nao houver problema, devolva lista vazia — nao invente defeito para parecer util.',
  'professionalReviewReasons: motivos para uma pessoa qualificada olhar antes',
  '(saude, direito, dinheiro, numero sem fonte). Vazio quando nao houver.',
  'NUNCA afirme que o conteudo esta em conformidade legal, nem que e seguro',
  'do ponto de vista juridico. Voce sinaliza risco; quem decide e o usuario.',
  'Responda apenas com JSON valido no formato:',
  '{"decision":"aprovado"|"atencao"|"bloqueado","brandFit":{"score":number,"notes":string},',
  '"problems":[{"excerpt":string,"issue":string,"suggestion":string}],',
  '"professionalReviewReasons":string[],"summary":string}'
].join(' ');

function buildUser(input) {
  const l = [`Marca: ${input.brandName}`, `Tema previsto: ${input.topic}`, ''];
  const add = (k, v) => { if (v) l.push(`${k}: ${v}`); };

  add('Tom de voz da marca', input.dna.tone);
  add('Publico', input.dna.audience);
  if (input.dna.personality.length) add('Personalidade', input.dna.personality.join(', '));
  if (input.dna.donts.length) l.push(`Proibido pela marca: ${input.dna.donts.join(', ')}`);
  if (input.dna.professionalRules.length) l.push(`Regras da profissao: ${input.dna.professionalRules.join('; ')}`);

  l.push('', '--- CONTEUDO A REVISAR ---');
  add('Hook', input.content.hook);
  add('Legenda', input.content.caption);
  add('CTA', input.content.cta);
  if (input.content.hashtags.length) add('Hashtags', input.content.hashtags.join(' '));
  if (input.content.slides.length) {
    l.push('Slides:');
    input.content.slides.forEach((s, i) => l.push(`  ${i + 1}. ${s}`));
  }

  if (input.recentCaptions.length) {
    l.push('', 'Publicado recentemente (verifique repeticao):');
    for (const c of input.recentCaptions) l.push(`- ${c.slice(0, 200)}`);
  }

  return l.join('\n');
}

export const contentReviewSkill = defineSkill({
  id: 'content-review',
  version: 1,
  description: 'Confere aderencia a marca e risco antes da publicacao.',
  inputSchema,
  outputSchema,
  temperature: 0.3, // revisão: previsível, não criativa
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});
